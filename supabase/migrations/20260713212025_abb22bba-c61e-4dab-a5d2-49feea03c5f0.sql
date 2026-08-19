
CREATE POLICY "restaurant-media public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'restaurant-media');

CREATE POLICY "restaurant-media auth insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'restaurant-media');

CREATE POLICY "restaurant-media auth update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'restaurant-media')
  WITH CHECK (bucket_id = 'restaurant-media');

CREATE POLICY "restaurant-media auth delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'restaurant-media');
