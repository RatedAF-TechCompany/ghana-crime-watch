-- Drop the overly permissive policy that exposes all user roles publicly
DROP POLICY IF EXISTS "User roles are viewable by everyone" ON public.user_roles;

-- Create a policy allowing admins to view all roles
CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create a policy allowing users to view their own role
CREATE POLICY "Users can view own role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);