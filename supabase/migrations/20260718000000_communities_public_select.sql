-- Allow anyone to see communities marked public, not just the owner or an
-- existing member. Without this, the "browse public communities" page
-- can't surface communities a user hasn't already joined - RLS was
-- silently hiding them.
alter policy "users can view their own or joined communities"
on public.communities
using (
  user_id = auth.uid()
  or is_private = false
  or exists (
    select 1
    from public.community_members m
    where m.community_id = communities.id
      and m.user_id = auth.uid()
  )
);
