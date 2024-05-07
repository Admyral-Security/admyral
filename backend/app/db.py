# from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine
# from sqlalchemy import text

from app.config import settings 


# TODO: https://github.com/MagicStack/asyncpg/issues/309
# => <class 'asyncpg.exceptions.ConnectionDoesNotExistError'>: connection was closed in the middle of operation
# setting pool_pre_ping=True for now. let's monitor whether this works
engine = create_async_engine(settings.DATABASE_URL_ASYNCPG, echo=True, future=True, pool_pre_ping=True)


# async def init_db():
#     async with engine.begin() as conn:
#         # await conn.execute(text(f"DROP SCHEMA {settings.DATABASE_SCHEMA} CASCADE"))
#         await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {settings.DATABASE_SCHEMA}"))
#         await conn.run_sync(SQLModel.metadata.create_all)

#         # Install triggers for syncing from auth.users to admyral.user_profile

#         # If we create a user in auth.users, we automatically create a user profiel in admyral.user_profile
#         await conn.execute(text(f"""
#             create or replace function public.handle_new_user()
#             returns trigger as $$
#             begin
#                 insert into {settings.DATABASE_SCHEMA}.user_profile (user_id, email, company, first_name, last_name)
#                 values (new.id, new.email, '', '', '');
#                 return new;
#             end;
#             $$ language plpgsql security definer;
#         """))

#         await conn.execute(text("""
#             create or replace trigger on_auth_user_created
#                 after insert on auth.users
#                 for each row execute procedure public.handle_new_user();
#         """))

#         # If we delete a user in admyral.user_profiles, we automatically delete the user in auth.users
#         await conn.execute(text("""
#             create or replace function public.handle_user_delete()
#             returns trigger as $$
#             begin
#                 delete from auth.users where id = old.user_id;
#                 return old;
#             end;
#             $$ language plpgsql security definer;
#         """))
#         await conn.execute(text(f"""
#             create or replace trigger on_profile_user_deleted
#                 after delete on {settings.DATABASE_SCHEMA}.user_profile
#                 for each row execute procedure public.handle_user_delete()
#         """))

#         # If a user confirms her/his email, then we propagate this information into the user_profiles table
#         await conn.execute(text(f"""
#             create or replace function public.handle_user_email_confirmed()
#             returns trigger as $$
#             begin
#                 if old.email_confirmed_at is NULL and new.email_confirmed_at is not NULL then
#                     update {settings.DATABASE_SCHEMA}.user_profile
#                     set email_confirmed_at = new.email_confirmed_at
#                     where user_id = new.id;
#                 end if;
#                 return new;
#             end;
#             $$ language plpgsql security definer;
#         """))
#         await conn.execute(text(f"""
#             create or replace trigger on_profile_user_email_confirmed
#                 after update on auth.users
#                 for each row execute procedure public.handle_user_email_confirmed()
#         """))
 