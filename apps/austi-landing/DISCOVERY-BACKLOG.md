# Maintenance coordination: discovery and pilot backlog

Based on the September 27, 2026 desk research for Austi's residential-maintenance concept.
Public evidence identifies workflows and potential problems; interviews must establish their
frequency, cost, and relevance to each operator. This backlog describes future work, not
completed interviews, shipped features, or commitments from prospects.

Priority: P0 = establish the problem; P1 = validate a focused solution; P2 = conditional pilot work.
Owner roles are suggestions, not assignments. All tickets are open; P2 tickets are blocked by D07.
Interview counts and case counts below are research targets, not statistical validation thresholds.

## D01 — Prepare and recruit operator discovery interviews

- **Priority / owner:** P0 / Founder or researcher
- **Dependencies:** None
- **Outcome:** Access to people who coordinate actual maintenance cases.
- **Tasks:** Prepare a neutral interview guide and draft tailored invitations for Civinity,
  Vantage, IMMOPOLSKA, and Rentadmin. Ask about recent work and existing improvements. Identify
  the daily coordinator and the person who owns the operating budget. Schedule interviews when
  outreach is separately authorised.
- **Deliverable:** Interview guide, invitation drafts, and recruitment tracker.
- **Done when:** Four operator interviews are scheduled, spanning at least two operating models;
  each has a named participant, role, and request to walk through anonymised cases. Record refusals
  or access barriers rather than treating them as evidence of no need.
- **Boundary:** Creating this ticket does not authorise sending outreach.

## D02 — Reconstruct real maintenance cases and establish a baseline

- **Priority / owner:** P0 / Researcher with maintenance coordinator
- **Dependencies:** D01
- **Outcome:** Evidence of where work and waiting accumulate.
- **Tasks:** Review one ordinary repair, one delayed repair, and one repeat-visit case per operator.
  Capture intake channel, missing information, decisions, systems used, handoffs, appointments,
  follow-ups, and completion evidence. Ask what worked well as well as what failed.
- **Deliverable:** Twelve anonymised case timelines and a baseline worksheet.
- **Done when:** Each case records elapsed time by stage, manual follow-up count, estimated active
  coordinator time, missed appointments, and repeat visits where available. Identify the source
  of each measure, distinguish estimates from records, and mark missing data explicitly. Separate
  delays caused by coordination from parts, capacity, cost, or unresolved technical work.

## D03 — Choose one initial customer segment and problem

- **Priority / owner:** P0 / Founder
- **Dependencies:** D02
- **Outcome:** A specific customer and workflow to prioritise.
- **Tasks:** Compare dispatch-led building maintenance, institutional rental operations, and
  rental agencies coordinating individual owners and external contractors. Assess recurring
  workload, consequences of delay, existing solutions, decision authority, and access to a pilot.
- **Deliverable:** Segment comparison and a one-page initial-customer definition.
- **Done when:** Select one segment and one recurring problem supported by case evidence from
  at least two operators, or explicitly record that more discovery is needed. Identify the daily
  user, budget owner, affected residents/contractors, and reasons to defer other segments.

## D04 — Map operating rules, exceptions, and delegable actions

- **Priority / owner:** P0 / Product lead with operator
- **Dependencies:** D02; narrow the final scope after D03
- **Outcome:** Clear boundaries for assistance and automation.
- **Tasks:** Document approval limits, cost-responsibility decisions, preferred contractors,
  warranty handling, access rules, emergency escalation, after-hours ownership, and completion
  criteria. Ask which actions staff would delegate and which they would review.
- **Deliverable:** Decision table with ordinary paths, exceptions, and responsible roles.
- **Done when:** A coordinator reviews the table against real cases. Every proposed action has
  a trigger, required information, authority, and fallback. Unknown or disputed responsibility
  goes to a person; software does not invent policy or decide liability.

## D05 — Audit existing tools and participation barriers

- **Priority / owner:** P1 / Product and technical leads
- **Dependencies:** D02, D03
- **Outcome:** Establish whether Austi can remove work without creating duplicate administration.
- **Tasks:** Walk through the selected operator's PMS, portal, inbox, and contractor communication.
  Identify the authoritative case record and investigate available integration/export options.
  Compare the chosen workflow with existing tools, including Property Meld and Fixflo. Interview
  at least two contractors and two residents about their actual channels, access, scheduling,
  reporting concerns, and willingness to use the proposed interaction.
- **Deliverable:** Current-system map, integration feasibility notes, and participation findings.
- **Done when:** Identify a concrete gap, a proposed way to keep records consistent, and the
  required steps for every participant. Mark access-dependent integration claims as unverified.
  Explain why configuration of an existing tool would or would not solve the problem.

## D06 — Test a prototype for the highest-priority workflow

- **Priority / owner:** P1 / Product designer or founder
- **Dependencies:** D03, D04, D05
- **Outcome:** Evidence that the proposed interaction reduces effort and uncertainty.
- **Tasks:** Prototype only the selected workflow. The current leading hypothesis is stalled-case
  follow-up with meaningful resident updates; change it if discovery points elsewhere. Test with
  coordinators and affected participants using anonymised cases. Include a non-response, a
  disputed decision, and a failed appointment where relevant.
- **Deliverable:** Prototype, test observations, and revisions.
- **Done when:** At least three coordinators attempt the workflow and affected external roles
  are represented. Record task completion, misunderstandings, review/correction effort, and
  comparison with their current method. Resolve critical confusion about authority, next action,
  or whether a repair is complete before recommending a pilot.

## D07 — Agree a measurable pilot or decide not to proceed

- **Priority / owner:** P1 / Founder with operator sponsor
- **Dependencies:** D02–D06
- **Outcome:** A bounded, evidence-backed investment decision.
- **Tasks:** Select one operator, one workflow, and only the necessary candidate tickets below.
  Agree duration, eligible cases, named operating owner, baseline/comparison method, expected
  benefit, and handling of exceptions. Include setup, duplicate-entry, and review time in costs.
- **Deliverable:** Pilot brief or written defer/stop decision.
- **Done when:** The sponsor agrees success thresholds before implementation. Measure coordinator
  minutes per case and manual follow-ups, with stage waiting time, missed appointments, repeat
  visits, and resident understanding as relevant secondary measures. Define stop conditions for
  added workload, incorrect actions, or unreliable records. Specify who can authorise live actions.
  If the evidence or sponsor is missing, keep implementation tickets blocked.

## P01 — Collect complete intake information and preserve case history

- **Priority / owner:** P2 / Product and engineering
- **Dependencies:** D07 selects intake as pilot scope
- **Outcome:** A usable job brief without repeatedly requesting the same information.
- **Tasks:** Capture reports from the agreed channel, ask relevant missing questions, attach
  photos/details, and preserve the original report alongside the structured case. Flag possible
  duplicates and relate prior repairs without silently merging distinct incidents.
- **Done when:** Pilot cases retain source messages, unanswered questions, and decision history;
  a second coordinator can take over without reconstructing the conversation. Urgent or uncertain
  reports follow the operator's escalation rules without waiting for a completed questionnaire.

## P02 — Prepare and track repair approval requests

- **Priority / owner:** P2 / Product and engineering
- **Dependencies:** D07 selects approval coordination as pilot scope
- **Outcome:** Faster, clearer decisions within the operator's authority.
- **Tasks:** Present scope, evidence, estimate, recommended action, and spending limit. Record
  approval, refusal, or clarification requests and follow up according to agreed rules.
- **Done when:** The record shows who authorised which scope and amount, and when. Changed scope
  or cost triggers the required review. Silence never counts as approval; uncertain responsibility
  is escalated. Residents receive an accurate explanation of the next step.

## P03 — Coordinate appointments and recover from failed arrangements

- **Priority / owner:** P2 / Product and engineering
- **Dependencies:** D07 selects scheduling as pilot scope
- **Outcome:** Confirmed appointments with sufficient access and job information.
- **Tasks:** Gather availability, contractor acceptance, access arrangements, and required job
  details through the agreed channels. Handle declined jobs, cancellations, and non-responses.
- **Done when:** An appointment is marked confirmed only after the required parties agree;
  participants can correct or cancel it; unresolved scheduling reaches a named coordinator.
  A failed visit records its reason and next action instead of closing the repair.
- **Scope limit:** Route optimisation is a separate investigation if dispatch evidence warrants it.

## P04 — Surface stalled cases and send meaningful updates

- **Priority / owner:** P2 / Product and engineering
- **Dependencies:** D07 selects stalled-case follow-up as pilot scope
- **Outcome:** Fewer manual checks and clearer expectations for residents.
- **Tasks:** Track responsible person, waiting reason, next action, and due time. Surface overdue
  actions, prepare or send authorised reminders, and update residents when the situation changes.
- **Done when:** Each active pilot case has an owner and next action or an explicit exception.
  Updates describe the actual dependency and next checkpoint without inventing repair dates.
  Replies stop obsolete reminders; staff can pause or take over; unchanged cases do not generate
  repeated noise. Actions and corrections are recorded in the agreed system.

## P05 — Verify completion and handle unresolved or recurring faults

- **Priority / owner:** P2 / Product and engineering
- **Dependencies:** D07 selects completion verification as pilot scope
- **Outcome:** Accurate closure with enough evidence to handle follow-up work.
- **Tasks:** Distinguish diagnosis, temporary mitigation, waiting for parts, completed work, and
  cancellation. Capture work notes, relevant evidence, costs, and resident feedback. Record the
  final outcome in the existing system.
- **Done when:** A visit or invoice alone does not automatically prove resolution. Closure follows
  the operator's agreed evidence rules; resident non-response is recorded separately from
  confirmation. A report that the issue persists creates an accountable follow-up linked to the
  original case. Record-sync failures are visible and recoverable.

## Evidence references

- [Civinity's stated technician-scheduling challenge](https://www.linkedin.com/posts/civinity_civinity-proptech-euaiact-activity-7470426199522111488-haPJ)
- [Vantage technical responsibilities — expired vacancy](https://www.pracuj.pl/praca/kierownik-kierowniczka-ds-technicznych-wroclaw,oferta,1005001050)
- [IMMOPOLSKA repair and approval workflow](https://obsluganajmu.pl/)
- [Rentadmin technical operations and existing platform](https://www.rentadmin.lt/apie-mus)
- [Eastbourne Lettings intake and coordination case study — vendor published](https://www.fixflo.com/resources/success-stories/block-management-eastbourne)
- [Complete Prime Residential case history and handover — vendor published](https://www.fixflo.com/resources/success-stories/lettings-complete-prime-residential)
- [Buildium 2026 US renter survey](https://www.buildium.com/resource/2026-renters-report/)
- [English private-renter research — fieldwork in 2024](https://www.gov.uk/government/publications/private-rented-sector-tenants-research-report/private-rented-sector-tenants-research-report)
- [Housing Ombudsman investigation of Hyde repair failures](https://www.housing-ombudsman.org.uk/reports/further-investigation-reports/hyde/)
- [Existing Property Meld workflow capabilities](https://help.propertymeld.com/hc/en-us/articles/45827528593939-How-to-Create-Manage-and-Cancel-Meld-Requests)
