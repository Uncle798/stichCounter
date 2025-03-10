import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createSession, generateEmailVerificationRequest, generateSessionToken, setSessionTokenCookie } from "$lib/server/authUtils";
import { registerFormSchema } from '$lib/formSchemas/schemas';
import { ratelimit } from '$lib/server/rateLimit';
import { prisma } from '$lib/server/prisma';
import { sendVerificationEmail } from "$lib/server/mailtrap";

export const load = (async () => {
    return {};
}) satisfies PageServerLoad;

export const actions: Actions = {
   default: async (event) => {
      const formData = await event.request.formData();
      const registerForm = await superValidate(formData, zod(registerFormSchema));
      if(!registerForm.valid){
         message(registerForm, 'Unable to process');
      }
      const { success, reset } = await ratelimit.register.limit(event.getClientAddress());
      if(!success){
         const timeRemaining = Math.floor((reset - Date.now()) / 1000);
         return message(registerForm, `Please wait ${timeRemaining} seconds before trying again`)
      }
      const validEmail = registerForm.data.email;
		const userAlreadyExists = await prisma.user.findUnique({
			where:{
				email: validEmail
			}
		})
      if(userAlreadyExists){
			if(userAlreadyExists.emailVerified === false){
				redirect(302, '/register/emailVerification')
			}
			redirect(302, '/login?toast=userAlreadyExists')
		}
      const user = await prisma.user.create({
			data:{ 
				email: validEmail, 
				givenName: registerForm.data.givenName,
				familyName: registerForm.data.familyName,
			}
		});
		const token = generateSessionToken();
		const session = await createSession(token, user.id);
		setSessionTokenCookie(event, token, session.expiresAt);
		const unitNum = event.url.searchParams.get('unitNum');
		const code = await generateEmailVerificationRequest(user.id, user.email!);
		sendVerificationEmail(code, user.email!);
		if(unitNum){	
			redirect(302, `/register/emailVerification?unitNum=${unitNum}`);
		}
		redirect(302, `/register/emailVerification`);
   },
};