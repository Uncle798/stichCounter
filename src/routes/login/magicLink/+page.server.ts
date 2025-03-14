import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { magicLinkFormSchema } from '$lib/formSchemas/schemas';
import { ratelimit } from '$lib/server/rateLimit';
import { generateMagicLink } from '$lib/server/authUtils';
import { prisma } from '$lib/server/prisma';
import { sendMagicLinkEmail } from '$lib/server/mailtrap';

export const load = (async (event) => {
   const magicLinkForm = await superValidate(zod(magicLinkFormSchema))
   const toastReason = event.url.searchParams.get('toast');
   const redirectTo = event.url.searchParams.get('redirectTo');
   const unitNum = event.url.searchParams.get('unitNum');
   return {magicLinkForm, toastReason, redirectTo, unitNum};
}) satisfies PageServerLoad;

export const actions:Actions ={
   default: async (event) =>{
      const formData = await event.request.formData();
      const magicLinkForm = await superValidate(formData, zod(magicLinkFormSchema));
      const { success, reset } = await ratelimit.login.limit(event.getClientAddress());
      if(!success){
         const timeRemaining = Math.floor((reset - Date.now()) / 1000);
         return message(magicLinkForm, `Please wait ${timeRemaining} seconds before trying again`)
      }
      const user = await prisma.user.findUnique({
         where: {
            email: magicLinkForm.data.email
         }
      })
      if(!user){
         return message(magicLinkForm, 'Email not found please register');
      }
      const magicLink = await generateMagicLink(magicLinkForm.data.email);
      await sendMagicLinkEmail(magicLink, user.email!);
      return message(magicLinkForm, 'An email has been sent to log you in. Feel free to close this tab.')
   }
}