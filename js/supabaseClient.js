// Supabase Client - Global Scope
const supabaseUrl = 'https://djhwqttaiggjaxmswggr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqaHdxdHRhaWdnamF4bXN3Z2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTA1NDMsImV4cCI6MjA4NzAyNjU0M30.Zh2bNIuoKKciE5z4m4k_4rBaETYs-AW2EiljJuTFgvY';

// 'supabase' global is provided by the CDN script
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
window.supabaseClient = supabaseClient;

console.log("Supabase Client Initialized (Global)");
