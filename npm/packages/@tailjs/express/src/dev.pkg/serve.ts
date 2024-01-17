import { setupServer } from "..";
import { expand } from "dotenv-expand";
import * as dotenv from "dotenv";
import { ClientLocation } from "@tailjs/maxmind";

expand(dotenv.config({ path: ".env" }));

setupServer({ extensions: [new ClientLocation()] });
