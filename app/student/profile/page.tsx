CREATE POLICY "Allow student profile image uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'student-profiles'
);

CREATE POLICY "Allow student profile images to be viewed"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'student-profiles'
);