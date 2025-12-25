import "dotenv/config";
import { deriveRawToken } from "../src/lib/tokens";

const memberId = process.argv[2];

if (!memberId) {
  console.error("Usage: pnpm dlx tsx scripts/print-assessment-link.ts <team_member_id>");
  process.exit(1);
}

const token = deriveRawToken("assessment", memberId);
console.log(`Assessment link:\nhttp://localhost:3000/a/${token}`);
