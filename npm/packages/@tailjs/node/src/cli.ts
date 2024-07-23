import { serve } from ".";

let host = process.argv[2] ?? undefined;
const port = parseInt(host);

serve(port ? { port } : { host });
