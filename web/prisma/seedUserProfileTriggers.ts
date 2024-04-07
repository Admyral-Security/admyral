// https://dev.to/mihaiandrei97/implementing-supabase-auth-in-next13-with-prisma-172i

import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
	throw new Error("Couldn't find db url");
}
console.log("Connecting to postgres database...");
const sql = postgres(dbUrl);
console.log("Done.");

/**
 * If we create a user in auth.users, we automatically create a
 * user profile in public.user_profiles
 */
async function setup_user_creation() {
	try {
		await sql`
            create or replace function public.handle_new_user()
            returns trigger as $$
            begin
                insert into public.user_profiles (user_id, email)
                values (new.id, new.email);
                return new;
            end;
            $$ language plpgsql security definer;
        `;

		await sql`
            create or replace trigger on_auth_user_created
                after insert on auth.users
                for each row execute procedure public.handle_new_user();
        `;
	} catch (error) {
		console.log(`Error in setup_user_creation: ${error}`);
		throw error;
	}
}

/**
 * If we delete a user in public.user_profiles, we automatically delete the
 * user in auth.users
 */
async function setup_user_deletion() {
	try {
		await sql`
            create or replace function public.handle_user_delete()
            returns trigger as $$
            begin
                delete from auth.users where id = old.user_id;
                return old;
            end;
            $$ language plpgsql security definer;
        `;

		await sql`
            create or replace trigger on_profile_user_deleted
                after delete on public.user_profiles
                for each row execute procedure public.handle_user_delete()
        `;
	} catch (error) {
		console.log(`Error in setup_user_deletion: ${error}`);
		throw error;
	}
}

async function update_email_confirmed() {
	try {
		await sql`
            create or replace function public.handle_user_email_confirmed()
            returns trigger as $$
            begin
                if old.email_confirmed_at is NULL and new.email_confirmed_at is not NULL then
                    update public.user_profiles
                    set email_confirmed_at = new.email_confirmed_at
                    where user_id = new.id;
                end if;
                return new;
            end;
            $$ language plpgsql security definer;
        `;

		await sql`
            create or replace trigger on_email_confirmed
                after update on auth.users
                for each row execute procedure public.handle_user_email_confirmed()
        `;
	} catch (error) {
		console.log(`Error in update_email_confirmed: ${error}`);
		throw error;
	}
}

async function main() {
	console.log("Setting up user creation trigger...");
	await setup_user_creation();
	console.log("Setting up user deletion trigger...");
	await setup_user_deletion();
	console.log("Setting up update email confirmed trigger...");
	await update_email_confirmed();
	console.log("Done.");
	process.exit();
}

main();
