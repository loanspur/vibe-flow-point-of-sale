-- Fix the get_current_user_role function to handle type coercion properly
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS user_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_role user_role;
BEGIN
  SELECT role INTO current_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Return the role if found, otherwise return 'user' as default
  IF current_role IS NULL THEN
    RETURN 'user'::user_role;
  ELSE
    RETURN current_role;
  END IF;
END;
$function$;