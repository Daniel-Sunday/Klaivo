-- RLS policies for storage.objects in the klaivo-uploads bucket

-- Allow authenticated users to upload new files (INSERT)
create policy "Allow authenticated uploads"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'klaivo-uploads');

-- Allow authenticated users to update their files (UPDATE)
create policy "Allow authenticated updates"
on storage.objects
for update
to authenticated
using (bucket_id = 'klaivo-uploads')
with check (bucket_id = 'klaivo-uploads');

-- Allow public read access to all files in this bucket (SELECT)
create policy "Allow public read access"
on storage.objects
for select
using (bucket_id = 'klaivo-uploads');
