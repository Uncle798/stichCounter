import type { PageServerLoad, Actions } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { magicLinkFormSchema } from '$lib/formSchemas/schemas';
import { ratelimit } from '$lib/server/rateLimit';
import { prisma } from '$lib/server/prisma';
import { generateMagicLink } from '$lib/server/authUtils';
import { sendMagicLinkEmail } from '$lib/server/mailtrap';
import { PUBLIC_COMPANY_EMAIL } from '$env/static/public';


export const load = (async () => {
    return {};
}) satisfies PageServerLoad;

export const actions: Actions = {
    default: async (event) => {
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
        const redirectTo = event.url.searchParams.get('redirectTo');
        const unitNum = event.url.searchParams.get('unitNum');
        const invoiceNum = event.url.searchParams.get('invoiceNum');
        if(redirectTo || unitNum || invoiceNum ){
           const fullLink = `${magicLink}?redirectTo=${redirectTo}&unitNum=${unitNum}&invoiceNum=${invoiceNum}`
           await sendMagicLinkEmail(fullLink, user.email!)
        } else {
           await sendMagicLinkEmail(magicLink, user.email!);
        }
        return message(magicLinkForm, `An email from ${PUBLIC_COMPANY_EMAIL} has been sent to log you in, please check your spam folder as it may have ended up there. Feel free to close this tab.`)  
    }
};