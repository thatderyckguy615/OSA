-- OSA seed data (PRD v2.3 canonical question bank)

-- Insert question version
INSERT INTO question_versions (id, name, is_active) VALUES (1, 'Initial Version', true);

-- Insert all 36 questions
INSERT INTO questions (version_id, question_order, dimension, subscale, question_text, is_reversed) VALUES
-- Alignment PD (1-4)
(1, 1, 'alignment', 'pd', 'I am clear on my team''s top three priorities, how they map to the firm''s goals for this year, and how success will be measured.', false),
(1, 2, 'alignment', 'pd', 'When a new request comes in (client or internal), I quickly decide to do, delegate, defer, or decline it—or I am empowered to negotiate the decision with my supervisor.', false),
(1, 3, 'alignment', 'pd', 'I say "yes" to work that feels urgent or political even when it pulls attention away from team/firm priorities or creates avoidable capacity strain.', true),
(1, 4, 'alignment', 'pd', 'When priorities compete (billable delivery vs. coaching vs. BD vs. internal initiatives), I force a clear choice instead of trying to do everything.', false),

-- Alignment CS (5-8)
(1, 5, 'alignment', 'cs', 'Our team/service line is consistently clear on what the firm expects us to prioritize right now, even when busy season pressure rises.', false),
(1, 6, 'alignment', 'cs', 'We get mixed signals about what matters most (e.g., charge hours vs. realization vs. quality vs. BD vs. developing people).', true),
(1, 7, 'alignment', 'cs', 'I know what outcomes I''m accountable for this month, and what I should stop doing if capacity tightens.', false),
(1, 8, 'alignment', 'cs', 'Our leaders translate firm strategy into specific "do this / not that" priorities for teams and service lines.', false),

-- Alignment OB (9-12)
(1, 9, 'alignment', 'ob', 'In the last 4 weeks, I declined a request (from a client, peer, or report) because it did not align with our current focus/top priorities.', false),
(1, 10, 'alignment', 'ob', 'In the last 4 weeks, I accepted or continued work that I knew didn''t fit our stated capacity limits or strategic priorities.', true),
(1, 11, 'alignment', 'ob', 'In the last 4 weeks, I spent time on at least one high-value, non-billable activity (e.g., business development, talent coaching, process improvement, strategic work).', false),
(1, 12, 'alignment', 'ob', 'In the last 4 weeks, when someone proposed work or an initiative, I evaluated whether it fit our priorities before committing (rather than automatically saying ''yes'').', false),

-- Execution PD (13-16)
(1, 13, 'execution', 'pd', 'I define my value by how well I leverage my team, not by how much technical work I do myself.', false),
(1, 14, 'execution', 'pd', 'I often feel it is better to "just do it myself" than to teach a staff member how to do it.', true),
(1, 15, 'execution', 'pd', 'I avoid an uncomfortable conversation (client, staff, peer, partner) even when it would unblock delivery, quality, or capacity.', true),
(1, 16, 'execution', 'pd', 'I am comfortable letting a team member struggle with a task in the short term so they can learn for the long term.', false),

-- Execution CS (17-20)
(1, 17, 'execution', 'cs', 'Our firm''s culture and processes push work down to the lowest capable level, rather than letting it float up to partners.', false),
(1, 18, 'execution', 'cs', 'We have a standardized "definition of done" for engagements so staff aren''t guessing what each Partner wants.', false),
(1, 19, 'execution', 'cs', 'Work frequently sits in a "Review Bottleneck" for periods without movement, rather than actively unblocking.', true),
(1, 20, 'execution', 'cs', 'We have effective systems (technology, processes, or support) that reduce lower-value tasks (scheduling and admin) so staff focus on higher-value billable work.', false),

-- Execution OB (21-24)
(1, 21, 'execution', 'ob', 'In the last 4 weeks, I delegated a task I am technically good at because it was below my level, even if it meant training a report.', false),
(1, 22, 'execution', 'ob', 'In the last 4 weeks, I identified and helped fix a workflow problem (e.g., handoff gap, unclear expectation, missing template).', false),
(1, 23, 'execution', 'ob', 'In the last 4 weeks, I completed work that someone at a lower level could have done, because it felt faster or easier than delegating it.', true),
(1, 24, 'execution', 'ob', 'In the last 4 weeks, when a client request went beyond original scope, I raised the issue and documented the change (rather than just doing the extra work).', false),

-- Accountability PD (25-28)
(1, 25, 'accountability', 'pd', 'I view giving direct, corrective feedback as an act of kindness, not an act of aggression.', false),
(1, 26, 'accountability', 'pd', 'I hesitate to address underperformance in peers or staff because I don''t want to damage the relationship.', true),
(1, 27, 'accountability', 'pd', 'When a client expands scope without paying, I am willing to directly address or escalate the issue right away.', false),
(1, 28, 'accountability', 'pd', 'I frequently redo work myself because it is faster or easier than explaining what was wrong and holding the person accountable.', true),

-- Accountability CS (29-32)
(1, 29, 'accountability', 'cs', 'In our firm, important work has a clear owner, due date, and definition of "done" (not just "someone''s on it").', false),
(1, 30, 'accountability', 'cs', 'We use a shared system to track to-dos/commitments and status so reality is visible (not trapped in inboxes or someone''s head).', false),
(1, 31, 'accountability', 'cs', 'People delay surfacing risks or delays because they fear blame, conflict, or "looking bad."', true),
(1, 32, 'accountability', 'cs', 'Performance reviews in our firm are honest assessments of behavior, not just "nice" conversations to ensure retention.', false),

-- Accountability OB (33-36)
(1, 33, 'accountability', 'ob', 'In the last 4 weeks, I had a difficult conversation with a peer or team member about a performance or behavioral issue (not just technical).', false),
(1, 34, 'accountability', 'ob', 'In the last 4 weeks, I absorbed extra client work beyond the original scope without discussing additional fees.', true),
(1, 35, 'accountability', 'ob', 'In the last 4 weeks, when I made an error or misjudgment, I acknowledged it openly rather than minimizing or deflecting it.', false),
(1, 36, 'accountability', 'ob', 'In the last 4 weeks, when something went wrong with my work or on my team (missed deadline, budget issue, quality problem), I participated in identifying what to do differently next time.', false);


