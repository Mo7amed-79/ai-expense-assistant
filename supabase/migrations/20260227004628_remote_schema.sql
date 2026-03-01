drop extension if exists "pg_net";


  create table "public"."device_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "fcm_token" text not null,
    "platform" text default 'android'::text,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."device_tokens" enable row level security;


  create table "public"."documents" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "doc_type" text not null default 'Other'::text,
    "image_path" text,
    "extracted_text" text,
    "extracted_fields" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."documents" enable row level security;


  create table "public"."expenses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "category" text not null default 'Other'::text,
    "amount" numeric(12,2) not null,
    "expense_date" date not null default CURRENT_DATE,
    "image_path" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."expenses" enable row level security;


  create table "public"."inbox_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "raw_text" text,
    "image_path" text,
    "source" text default 'app'::text,
    "status" text default 'new'::text,
    "parsed_json" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."inbox_items" enable row level security;


  create table "public"."reminders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "due_at" timestamp with time zone,
    "rrule" text,
    "next_run_at" timestamp with time zone,
    "enabled" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."reminders" enable row level security;

CREATE UNIQUE INDEX device_tokens_pkey ON public.device_tokens USING btree (id);

CREATE UNIQUE INDEX device_tokens_user_id_fcm_token_key ON public.device_tokens USING btree (user_id, fcm_token);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

CREATE UNIQUE INDEX inbox_items_pkey ON public.inbox_items USING btree (id);

CREATE UNIQUE INDEX reminders_pkey ON public.reminders USING btree (id);

alter table "public"."device_tokens" add constraint "device_tokens_pkey" PRIMARY KEY using index "device_tokens_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."expenses" add constraint "expenses_pkey" PRIMARY KEY using index "expenses_pkey";

alter table "public"."inbox_items" add constraint "inbox_items_pkey" PRIMARY KEY using index "inbox_items_pkey";

alter table "public"."reminders" add constraint "reminders_pkey" PRIMARY KEY using index "reminders_pkey";

alter table "public"."device_tokens" add constraint "device_tokens_user_id_fcm_token_key" UNIQUE using index "device_tokens_user_id_fcm_token_key";

alter table "public"."device_tokens" add constraint "device_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."device_tokens" validate constraint "device_tokens_user_id_fkey";

alter table "public"."documents" add constraint "documents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."documents" validate constraint "documents_user_id_fkey";

alter table "public"."expenses" add constraint "expenses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."expenses" validate constraint "expenses_user_id_fkey";

alter table "public"."inbox_items" add constraint "inbox_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."inbox_items" validate constraint "inbox_items_user_id_fkey";

alter table "public"."reminders" add constraint "reminders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."reminders" validate constraint "reminders_user_id_fkey";

grant delete on table "public"."device_tokens" to "anon";

grant insert on table "public"."device_tokens" to "anon";

grant references on table "public"."device_tokens" to "anon";

grant select on table "public"."device_tokens" to "anon";

grant trigger on table "public"."device_tokens" to "anon";

grant truncate on table "public"."device_tokens" to "anon";

grant update on table "public"."device_tokens" to "anon";

grant delete on table "public"."device_tokens" to "authenticated";

grant insert on table "public"."device_tokens" to "authenticated";

grant references on table "public"."device_tokens" to "authenticated";

grant select on table "public"."device_tokens" to "authenticated";

grant trigger on table "public"."device_tokens" to "authenticated";

grant truncate on table "public"."device_tokens" to "authenticated";

grant update on table "public"."device_tokens" to "authenticated";

grant delete on table "public"."device_tokens" to "service_role";

grant insert on table "public"."device_tokens" to "service_role";

grant references on table "public"."device_tokens" to "service_role";

grant select on table "public"."device_tokens" to "service_role";

grant trigger on table "public"."device_tokens" to "service_role";

grant truncate on table "public"."device_tokens" to "service_role";

grant update on table "public"."device_tokens" to "service_role";

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

grant delete on table "public"."expenses" to "anon";

grant insert on table "public"."expenses" to "anon";

grant references on table "public"."expenses" to "anon";

grant select on table "public"."expenses" to "anon";

grant trigger on table "public"."expenses" to "anon";

grant truncate on table "public"."expenses" to "anon";

grant update on table "public"."expenses" to "anon";

grant delete on table "public"."expenses" to "authenticated";

grant insert on table "public"."expenses" to "authenticated";

grant references on table "public"."expenses" to "authenticated";

grant select on table "public"."expenses" to "authenticated";

grant trigger on table "public"."expenses" to "authenticated";

grant truncate on table "public"."expenses" to "authenticated";

grant update on table "public"."expenses" to "authenticated";

grant delete on table "public"."expenses" to "service_role";

grant insert on table "public"."expenses" to "service_role";

grant references on table "public"."expenses" to "service_role";

grant select on table "public"."expenses" to "service_role";

grant trigger on table "public"."expenses" to "service_role";

grant truncate on table "public"."expenses" to "service_role";

grant update on table "public"."expenses" to "service_role";

grant delete on table "public"."inbox_items" to "anon";

grant insert on table "public"."inbox_items" to "anon";

grant references on table "public"."inbox_items" to "anon";

grant select on table "public"."inbox_items" to "anon";

grant trigger on table "public"."inbox_items" to "anon";

grant truncate on table "public"."inbox_items" to "anon";

grant update on table "public"."inbox_items" to "anon";

grant delete on table "public"."inbox_items" to "authenticated";

grant insert on table "public"."inbox_items" to "authenticated";

grant references on table "public"."inbox_items" to "authenticated";

grant select on table "public"."inbox_items" to "authenticated";

grant trigger on table "public"."inbox_items" to "authenticated";

grant truncate on table "public"."inbox_items" to "authenticated";

grant update on table "public"."inbox_items" to "authenticated";

grant delete on table "public"."inbox_items" to "service_role";

grant insert on table "public"."inbox_items" to "service_role";

grant references on table "public"."inbox_items" to "service_role";

grant select on table "public"."inbox_items" to "service_role";

grant trigger on table "public"."inbox_items" to "service_role";

grant truncate on table "public"."inbox_items" to "service_role";

grant update on table "public"."inbox_items" to "service_role";

grant delete on table "public"."reminders" to "anon";

grant insert on table "public"."reminders" to "anon";

grant references on table "public"."reminders" to "anon";

grant select on table "public"."reminders" to "anon";

grant trigger on table "public"."reminders" to "anon";

grant truncate on table "public"."reminders" to "anon";

grant update on table "public"."reminders" to "anon";

grant delete on table "public"."reminders" to "authenticated";

grant insert on table "public"."reminders" to "authenticated";

grant references on table "public"."reminders" to "authenticated";

grant select on table "public"."reminders" to "authenticated";

grant trigger on table "public"."reminders" to "authenticated";

grant truncate on table "public"."reminders" to "authenticated";

grant update on table "public"."reminders" to "authenticated";

grant delete on table "public"."reminders" to "service_role";

grant insert on table "public"."reminders" to "service_role";

grant references on table "public"."reminders" to "service_role";

grant select on table "public"."reminders" to "service_role";

grant trigger on table "public"."reminders" to "service_role";

grant truncate on table "public"."reminders" to "service_role";

grant update on table "public"."reminders" to "service_role";


  create policy "device tokens owner"
  on "public"."device_tokens"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "documents owner"
  on "public"."documents"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "expenses owner"
  on "public"."expenses"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "inbox owner"
  on "public"."inbox_items"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "reminders owner"
  on "public"."reminders"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Allow authenticated uploads to user folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'inbox'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Allow users to delete their own files"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'inbox'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Allow users to view their own files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'inbox'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "read own files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'user_uploads'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "upload own files"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'user_uploads'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



