// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Session, User } from "@prisma/client";

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	const THEMES: {
		name: string,
		content: string
	}[];
}

export {};
