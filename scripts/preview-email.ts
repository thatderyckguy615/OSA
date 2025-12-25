/**
 * Dev-only script to preview email HTML
 * Run: npx tsx scripts/preview-email.ts
 * 
 * Outputs HTML to console for inspection (no secrets required)
 */

import {
  buildLeaderWelcome,
  buildParticipantInvite,
  buildPersonalResults,
  buildReportReady,
} from '../src/lib/email/templates';

console.log('\n=== EMAIL HTML PREVIEW ===\n');

// 1. Leader Welcome
console.log('--- LEADER WELCOME EMAIL ---\n');
const leaderWelcome = buildLeaderWelcome({
  leaderName: 'Jane Doe',
  firmName: 'Acme Accounting LLP',
  memberCount: 5,
  dashboardLink: 'https://example.com/d/abc123',
  assessmentLink: 'https://example.com/a/xyz789',
});
console.log('Subject:', leaderWelcome.subject);
console.log('\nHTML:\n');
console.log(leaderWelcome.html);
console.log('\n\n');

// 2. Participant Invite
console.log('--- PARTICIPANT INVITE EMAIL ---\n');
const participantInvite = buildParticipantInvite({
  leaderName: 'Jane Doe',
  firmName: 'Acme Accounting LLP',
  assessmentLink: 'https://example.com/a/participant123',
});
console.log('Subject:', participantInvite.subject);
console.log('\nHTML:\n');
console.log(participantInvite.html);
console.log('\n\n');

// 3. Personal Results
console.log('--- PERSONAL RESULTS EMAIL ---\n');
const personalResults = buildPersonalResults({
  displayName: 'John Smith',
  alignment: 7.5,
  execution: 6.8,
  accountability: 8.2,
});
console.log('Subject:', personalResults.subject);
console.log('\nHTML:\n');
console.log(personalResults.html);
console.log('\n\n');

// 4. Report Ready
console.log('--- REPORT READY EMAIL ---\n');
const reportReady = buildReportReady({
  leaderName: 'Jane Doe',
  firmName: 'Acme Accounting LLP',
  completionCount: 4,
  totalCount: 5,
  reportLink: 'https://example.com/r/report123',
});
console.log('Subject:', reportReady.subject);
console.log('\nHTML:\n');
console.log(reportReady.html);
console.log('\n\n');

console.log('=== END EMAIL PREVIEW ===\n');

