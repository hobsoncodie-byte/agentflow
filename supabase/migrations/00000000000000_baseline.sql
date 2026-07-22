--
-- PostgreSQL database dump
--

\restrict uV7MzeOqexeFWyJMRKVZ7Pik5cYuDipZ42IGtyUkCR2hWGrhOrg9Oh7GeQutrWO

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4 (Ubuntu 18.4-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: can_manage_community(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_community(c_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.communities c
    where c.id = c_id
      and c.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.community_members m
    where m.community_id = c_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;


--
-- Name: is_community_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_community_member(c_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.communities c
    where c.id = c_id
      and c.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.community_members m
    where m.community_id = c_id
      and m.user_id = auth.uid()
  );
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    system_prompt text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: communities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    category text,
    visibility text DEFAULT 'private'::text NOT NULL,
    member_count integer DEFAULT 0 NOT NULL,
    cover_image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_private boolean DEFAULT true NOT NULL,
    CONSTRAINT communities_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'public'::text])))
);


--
-- Name: community_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    deployed_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    invited_email text NOT NULL,
    invited_by uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    CONSTRAINT community_invites_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text]))),
    CONSTRAINT community_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text])))
);


--
-- Name: community_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
);


--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_posts_content_check CHECK ((char_length(content) > 0))
);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_community_id_agent_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_community_id_agent_id_user_id_key UNIQUE (community_id, agent_id, user_id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: communities communities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_pkey PRIMARY KEY (id);


--
-- Name: community_agents community_agents_community_id_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_agents
    ADD CONSTRAINT community_agents_community_id_agent_id_key UNIQUE (community_id, agent_id);


--
-- Name: community_agents community_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_agents
    ADD CONSTRAINT community_agents_pkey PRIMARY KEY (id);


--
-- Name: community_invites community_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_invites
    ADD CONSTRAINT community_invites_pkey PRIMARY KEY (id);


--
-- Name: community_invites community_invites_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_invites
    ADD CONSTRAINT community_invites_token_key UNIQUE (token);


--
-- Name: community_members community_members_community_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_community_id_user_id_key UNIQUE (community_id, user_id);


--
-- Name: community_members community_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_pkey PRIMARY KEY (id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: community_invites_community_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_invites_community_id_idx ON public.community_invites USING btree (community_id);


--
-- Name: community_invites_pending_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX community_invites_pending_email_idx ON public.community_invites USING btree (community_id, lower(invited_email)) WHERE (status = 'pending'::text);


--
-- Name: community_members_community_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_members_community_id_idx ON public.community_members USING btree (community_id);


--
-- Name: community_members_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_members_user_id_idx ON public.community_members USING btree (user_id);


--
-- Name: community_posts_community_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_posts_community_id_idx ON public.community_posts USING btree (community_id);


--
-- Name: community_posts_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_posts_created_at_idx ON public.community_posts USING btree (created_at DESC);


--
-- Name: community_posts set_community_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_community_posts_updated_at BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: communities communities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_agents community_agents_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_agents
    ADD CONSTRAINT community_agents_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: community_agents community_agents_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_agents
    ADD CONSTRAINT community_agents_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_agents community_agents_deployed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_agents
    ADD CONSTRAINT community_agents_deployed_by_fkey FOREIGN KEY (deployed_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_invites community_invites_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_invites
    ADD CONSTRAINT community_invites_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_invites community_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_invites
    ADD CONSTRAINT community_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_members community_members_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_members community_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_posts community_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_posts community_posts_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

--
-- Name: community_posts authors or managers can delete posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authors or managers can delete posts" ON public.community_posts FOR DELETE USING (((author_id = auth.uid()) OR public.can_manage_community(community_id)));


--
-- Name: community_posts authors or managers can update posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authors or managers can update posts" ON public.community_posts FOR UPDATE USING (((author_id = auth.uid()) OR public.can_manage_community(community_id))) WITH CHECK (((author_id = auth.uid()) OR public.can_manage_community(community_id)));


--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: communities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

--
-- Name: community_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: community_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: community_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

--
-- Name: community_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: community_members managers can add memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "managers can add memberships" ON public.community_members FOR INSERT WITH CHECK (public.can_manage_community(community_id));


--
-- Name: community_invites managers can create invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "managers can create invites" ON public.community_invites FOR INSERT WITH CHECK ((public.can_manage_community(community_id) AND (invited_by = auth.uid())));


--
-- Name: community_invites managers can delete invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "managers can delete invites" ON public.community_invites FOR DELETE USING (public.can_manage_community(community_id));


--
-- Name: community_members managers can delete memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "managers can delete memberships" ON public.community_members FOR DELETE USING (public.can_manage_community(community_id));


--
-- Name: community_invites managers can update invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "managers can update invites" ON public.community_invites FOR UPDATE USING ((public.can_manage_community(community_id) OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))))) WITH CHECK ((public.can_manage_community(community_id) OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))));


--
-- Name: community_members managers can update memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "managers can update memberships" ON public.community_members FOR UPDATE USING (public.can_manage_community(community_id)) WITH CHECK (public.can_manage_community(community_id));


--
-- Name: community_invites managers can view invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "managers can view invites" ON public.community_invites FOR SELECT USING ((public.can_manage_community(community_id) OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))));


--
-- Name: community_agents member read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "member read" ON public.community_agents FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.communities
  WHERE ((communities.id = community_agents.community_id) AND (communities.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.community_members
  WHERE ((community_members.community_id = community_agents.community_id) AND (community_members.user_id = auth.uid()))))));


--
-- Name: community_posts members can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "members can create posts" ON public.community_posts FOR INSERT WITH CHECK ((public.is_community_member(community_id) AND (author_id = auth.uid())));


--
-- Name: community_members members can view memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "members can view memberships" ON public.community_members FOR SELECT USING (public.is_community_member(community_id));


--
-- Name: community_posts members can view posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "members can view posts" ON public.community_posts FOR SELECT USING (public.is_community_member(community_id));


--
-- Name: agents owner access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner access" ON public.agents USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_sessions owner access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner access" ON public.chat_sessions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: community_agents owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner delete" ON public.community_agents FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.communities
  WHERE ((communities.id = community_agents.community_id) AND (communities.user_id = auth.uid())))));


--
-- Name: community_agents owner write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner write" ON public.community_agents FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.communities
  WHERE ((communities.id = community_agents.community_id) AND (communities.user_id = auth.uid())))));


--
-- Name: communities owners can delete their own communities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owners can delete their own communities" ON public.communities FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: communities owners can update their own communities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owners can update their own communities" ON public.communities FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: chat_messages session owner insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "session owner insert" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


--
-- Name: chat_messages session owner read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "session owner read" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


--
-- Name: communities users can create their own communities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can create their own communities" ON public.communities FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: communities users can view their own or joined communities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can view their own or joined communities" ON public.communities FOR SELECT USING (((user_id = auth.uid()) OR (is_private = false) OR (EXISTS ( SELECT 1
   FROM public.community_members m
  WHERE ((m.community_id = communities.id) AND (m.user_id = auth.uid()))))));


--
-- PostgreSQL database dump complete
--

\unrestrict uV7MzeOqexeFWyJMRKVZ7Pik5cYuDipZ42IGtyUkCR2hWGrhOrg9Oh7GeQutrWO

