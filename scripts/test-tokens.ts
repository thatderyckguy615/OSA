import { config } from "dotenv";
config({ path: ".env.local" });

import { deriveRawToken, hashToken } from "../src/lib/tokens";

const memberId = "11111111-1111-1111-1111-111111111111";

const raw = deriveRawToken("assessment", memberId);
const hash = hashToken(raw);

console.log({ raw, hash });
