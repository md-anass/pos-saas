const url = 'https://klmzpircqoulxgwahchv.supabase.co/rest/v1/purchases?limit=1';
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsbXpwaXJjcW91bHhnd2FoY2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NzUzMzksImV4cCI6MjEwMjU1MTMzOX0.vK-xkF-Oe9tUtaLfP74Zg5Me50AQzPgUYjbgUaCg4J0';

async function run() {
    console.log("Fetching purchases CSV headers...");
    const res = await fetch(url, {
        headers: { 
            'apikey': apikey,
            'Authorization': `Bearer ${apikey}`,
            'Accept': 'text/csv'
        }
    });
    console.log("Status:", res.status);
    console.log("Headers:", [...res.headers.entries()]);
    const body = await res.text();
    console.log("Body:", JSON.stringify(body));
}

run();
