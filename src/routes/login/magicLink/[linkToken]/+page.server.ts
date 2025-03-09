import { createSession, generateSessionToken, setSessionTokenCookie, verifyMagicLink } from '$lib/server/authUtils';
import { prisma } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load = (async (event) => {
   const linkToken = event.params.linkToken;
   const result = await verifyMagicLink(linkToken);
   if(result === 'not found'){
      return fail(404, {message:'token not found'})
   }
   if(result === 'expired'){
      redirect(302, '/login?toast=linkExpired');
   }
   const user = await prisma.user.update({
      where:{
         email: result
      },
      data: {
         emailVerified: true
      }
   })
   if(!user){
      return fail(500)
   }
   const token =  generateSessionToken();
   const session = await createSession(token, user.id!);
   setSessionTokenCookie(event, token, session.expiresAt);
   const redirectTo = event.url.searchParams.get('redirectTo');
   const unitNum = event.url.searchParams.get('unitNum');
   switch (redirectTo) {
      case 'home':
         redirect(303, '/');
         break;
      case 'newLease':
         redirect(302, `/newLease?unitNum=${unitNum}`)
         break;
      case 'units':
         if(unitNum){
            redirect(302, `/units/${unitNum}`)
         }
         redirect(302, '/units')
         break;
      default:
         redirect(302, '/units/available');
         break;
   }
}) satisfies PageServerLoad;