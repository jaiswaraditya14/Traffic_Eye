# Traffic Eye — Academic Capstone Examiner Evaluation

**Evaluation perspective:** Senior Final-Year Project Examiner  
**Project type:** Working mobile/cloud/AI capstone prototype  
**Evaluation boundary:** Concept, innovation, working model, features, personas, user experience, AI integration, workflow, demonstrability, real-world utility, and academic value only

> Traffic Eye is evaluated as a decision-support and citizen-reporting prototype. It does not issue fines, determine legal guilt, replace police judgment, or claim official government integration.

## 1. Executive verdict and grade

### Overall grade

| Evaluation Area | Score /10 | Examiner Reason |
|---|---:|---|
| Problem Relevance | **9.2** | Traffic-rule violations, limited monitoring coverage, and slow citizen-to-authority reporting are recognizable public-safety problems. |
| Innovation | **8.7** | The combination of citizen evidence, staged AI analysis, officer verification, rewards, realtime workflow, and geospatial insight is more original than a conventional reporting application. |
| Feature Completeness | **8.6** | Both citizen and officer journeys are represented from evidence capture through human decision and feedback. Some elements remain prototype mechanisms rather than institutional services. |
| AI Integration | **8.5** | AI Vision and OCR have clear roles in evidence triage. The multi-model design adds technical depth, but no claim of perfect accuracy or automated enforcement is justified. |
| Working Model | **8.8** | The prototype demonstrates an end-to-end flow involving mobile interaction, cloud persistence, live updates, officer decisions, and user feedback. |
| User Experience | **8.5** | Each persona has a focused experience, guided reporting, status feedback, review tools, map interaction, and a coherent visual journey. |
| Real-world Utility | **8.1** | The system could improve reporting and hotspot awareness, but real deployment would require authority participation, legal policy, operational verification, and public adoption. |
| Demonstration Quality | **9.0** | The two-device realtime story and visibly labeled offline demo fallback make the project highly demonstrable and resilient during evaluation. |
| Academic Value | **9.1** | The project joins mobile computing, AI, OCR, cloud services, realtime systems, human-in-the-loop decisions, gamification, and mapping in one defensible system. |
| **Overall** | **8.7** | **A strong and sufficiently complex final-year capstone, provided the team demonstrates the complete connected workflow rather than isolated screens.** |

### Executive verdict

Traffic Eye addresses a genuine road-safety and civic-participation problem through a convincing two-persona workflow. Its strongest quality is that the system does not stop at capturing and storing a complaint: it analyzes evidence, extracts vehicle information, synchronizes a report to an officer, supports a human decision, feeds the outcome back to the citizen, and aggregates accepted reports geographically.

This distinguishes it from a basic CRUD application. The value lies in the coordination of mobile evidence capture, AI-assisted interpretation, cloud state, realtime delivery, officer review, gamified participation, and hotspot visualization. Each technology contributes to one continuous problem-solving workflow rather than appearing as an isolated technical demonstration.

The two-persona design is convincing because citizens and officers do not merely see different menus. They have different goals, information needs, and responsibilities: the citizen creates and tracks evidence, while the officer validates it and converts accepted reports into actionable information.

The project is sufficiently complex for a final-year engineering capstone. It demonstrates meaningful AI, cloud, mobile, realtime, and map integration while retaining human verification at the decision point.

**Classification: Very Good, approaching Excellent.** The project is feature-rich and academically strong, but a strict examiner should reserve an “Excellent” classification until the team presents measured AI/OCR performance, realistic field testing, and evidence that the complete workflow works consistently under live conditions.

## 2. User personas and complete user journeys

## A. Citizen journey

### 1. Open application and sign in

- **Citizen action:** Opens Traffic Eye and enters the citizen experience.
- **System action:** Loads the citizen profile, report history, notifications, and reward status.
- **AI contribution:** None at this stage.
- **Supabase contribution:** Supplies the citizen's cloud-backed account and report data.
- **User feedback:** A citizen-focused home screen presents reporting, status, and reward options.
- **Value:** The citizen immediately understands that the app is for participation, not official enforcement.

### 2. Capture or select evidence

- **Citizen action:** Takes a photograph, selects an image, or records/selects a short video of a traffic violation.
- **System action:** Checks whether usable evidence and a valid incident location are available, extracts available image metadata, and prepares the media for the next step.
- **AI contribution:** AI has not yet decided anything; this stage acquires the evidence it will inspect.
- **Supabase contribution:** No final report is created merely by opening the capture screen.
- **User feedback:** The selected media and location are shown for confirmation.
- **Value:** Capturing evidence at the source reduces ambiguity compared with a text-only complaint.

### 3. AI processing

- **Citizen action:** Starts analysis and waits for the guided processing sequence.
- **System action:** Sends supported evidence through the server-managed AI workflow and reports progress rather than leaving the user on a frozen screen.
- **AI contribution:** Vision models inspect the scene; the OCR stage attempts to read the number plate; an audit stage checks the structured result.
- **Supabase contribution:** The cloud function coordinates the AI request without exposing provider credentials to the mobile application.
- **User feedback:** The user sees processing stages and receives either a result or a safe manual-review path if analysis is unavailable or uncertain.
- **Value:** AI reduces the amount of information the citizen must type and gives the officer a structured starting point.

### 4. Violation detection

- **Citizen action:** Reviews the suggested violation rather than blindly accepting it.
- **System action:** Converts AI observations into a readable violation candidate and confidence/uncertainty result.
- **AI contribution:** Suggests likely visible violations such as helmet, rider-count, or related observable conditions supported by the evidence.
- **Supabase contribution:** At this point the cloud coordinates analysis; it does not make a legal finding.
- **User feedback:** A violation type, description, confidence, and manual-review indication are presented.
- **If accepted later:** The detected value becomes part of the submitted report for officer verification.

### 5. License-plate OCR

- **Citizen action:** Checks the detected plate and corrects it when necessary.
- **System action:** Normalizes the OCR result into a vehicle-number field and uses it to help identify possible duplicate reports.
- **AI contribution:** Locates and reads visible plate characters.
- **Supabase contribution:** Stores the submitted vehicle identifier with the report after confirmation.
- **User feedback:** The recognized plate is shown explicitly; unreadable or uncertain plates are not presented as guaranteed truth.
- **If accepted later:** The officer sees the submitted/OCR-assisted number alongside the evidence.

### 6. Evidence preview and confirmation

- **Citizen action:** Reviews the image/video, location, violation, description, severity, and plate before submission.
- **System action:** Combines the media, AI result, location, and citizen confirmation into one report draft.
- **AI contribution:** Provides recommendations; it does not remove citizen or officer oversight.
- **Supabase contribution:** No final decision occurs here.
- **User feedback:** A consolidated preview allows the citizen to catch an obviously wrong AI/OCR result.
- **Value:** This is an important human check before cloud submission.

### 7. Submit report

- **Citizen action:** Confirms the final report once.
- **System action:** Uploads evidence, creates the report, avoids accidental duplicate submission, and shows a clear success or recoverable error state.
- **AI contribution:** Its structured result is attached as supporting information.
- **Supabase contribution:** Storage holds the evidence and the database holds the report status and associated information.
- **User feedback:** The citizen receives confirmation and can view the report in their history.
- **If accepted later:** The same report progresses rather than requiring the citizen to recreate it.

### 8. Cloud sync and officer review

- **Citizen action:** Waits for the report outcome and can track its status.
- **System action:** Publishes the new cloud state to the officer experience and later synchronizes the officer's decision back to the citizen.
- **AI contribution:** Gives the officer a preliminary interpretation and OCR result.
- **Supabase contribution:** Acts as the common source of report state and delivers realtime changes.
- **User feedback:** The report moves through pending, approved, or rejected status.

### 9. Approval and points

- **Citizen action:** Opens the status update or notification.
- **System action:** If the officer approves the evidence, records the accepted outcome and updates the citizen's contribution/reward status.
- **AI contribution:** None to the final authority decision; the officer owns that decision.
- **Supabase contribution:** Synchronizes the report outcome, notification, and point/reward data.
- **User feedback:** The citizen sees approval/rejection, remarks where provided, and awarded points for a valid contribution.
- **Value:** The citizen receives closure instead of submitting a complaint into an invisible process.

### 10. Rewards

- **Citizen action:** Views accumulated points and eligible reward items.
- **System action:** Presents rewards as a participation incentive.
- **AI contribution:** None.
- **Supabase contribution:** Maintains the citizen's contribution/reward state.
- **User feedback:** Clear balance and reward eligibility make participation tangible.
- **Value:** Gamification encourages sustained civic participation, but it remains a motivation mechanism—not the enforcement core of Traffic Eye.

### Citizen-journey assessment

The citizen journey is useful because it lowers the effort required to make a structured report, provides evidence and location context, and gives visible feedback after review. Its strongest design decision is retaining human verification. A citizen is not asked to prove a legal case; the citizen contributes evidence that can be prioritized and checked by an authorized reviewer.

## B. Traffic-officer journey

### 1. Officer login

- **Officer action:** Signs in through the officer experience.
- **System response:** Loads the operational dashboard rather than the citizen reporting interface.
- **AI contribution:** None.
- **Realtime contribution:** Prepares the dashboard to receive report changes.
- **Outcome:** The officer sees review-oriented information, not rewards and citizen capture tools.

### 2. Realtime incoming queue

- **Officer action:** Opens the pending-report queue.
- **System response:** Displays incoming reports with information useful for prioritization, such as time, violation, location, and severity.
- **AI contribution:** Supplies initial classifications that help organize attention.
- **Realtime contribution:** A newly submitted citizen report can appear without manual refresh.
- **Outcome:** The queue behaves like a live operational workflow rather than a static database list.

### 3. Open a report

- **Officer action:** Selects one pending item.
- **System response:** Opens the full evidence and report details.
- **AI contribution:** Shows the suggested violation, description, confidence/uncertainty, and OCR result.
- **Realtime contribution:** The report remains linked to the shared cloud state.
- **Outcome:** The officer has both raw evidence and AI assistance in one review screen.

### 4. Review evidence

- **Officer action:** Inspects the photograph/video, location, time, and reported details.
- **System response:** Presents the original evidence rather than only the AI's conclusion.
- **AI contribution:** Acts as a triage assistant, not a substitute for visual review.
- **Decision process:** The officer compares visible evidence against the AI suggestion and the submitted information.
- **Outcome:** The officer can reject uncertain, insufficient, duplicate, or incorrect evidence.

### 5. Verify violation and plate

- **Officer action:** Confirms whether the stated violation is visible and whether the OCR plate matches the image.
- **System response:** Keeps the AI result and evidence side by side.
- **AI contribution:** Reduces initial inspection effort by proposing a category and plate string.
- **Decision process:** Any mismatch is resolved in favor of the human review, not the model.
- **Outcome:** Only a reviewed report moves forward.

### 6. Approve or reject

- **Officer action:** Selects a decision and may add public remarks or internal context.
- **System response:** Finalizes the report once and updates its status.
- **AI contribution:** None to the authority of the final decision.
- **Realtime contribution:** The decision propagates to the citizen's report history/notification and the officer's queue.
- **Outcome:** Approved reports can contribute to points and hotspot analysis; rejected reports remain documented as reviewed outcomes.

### 7. Hotspot update

- **Officer action:** Opens the MapLibre hotspot view.
- **System response:** Displays approved report locations as geographic points, clusters, and heat intensity.
- **AI contribution:** Indirect—the map uses officer-reviewed reports whose initial categorization was AI-assisted.
- **Realtime contribution:** New approved data becomes part of the evolving operational picture.
- **Outcome:** Repeated incidents become visible as location patterns rather than isolated reports.

### Officer-journey assessment

The officer dashboard fundamentally differs from the citizen experience. The citizen journey is evidence creation, submission, transparency, and motivation. The officer journey is prioritization, validation, decision-making, and geographic analysis. This separation is academically important because it demonstrates role-specific system design rather than one interface with hidden buttons.

## 3. Complete working-feature breakdown

### A. AI Vision

1. **What it does:** Examines supported traffic-evidence imagery and proposes visible vehicle/occupant/violation information.
2. **How it works conceptually:** The mobile app sends evidence to a server-controlled staged AI pipeline. Vision output is converted into structured evidence and checked before presentation.
3. **Persona:** The citizen initiates it; both citizen and officer view its result.
4. **Usefulness:** Reduces manual entry, supports report triage, and focuses officer attention.
5. **Academic value:** Demonstrates applied computer vision, structured model output, fallbacks, time limits, and human-in-the-loop design.
6. **Viva demonstration:** Submit a clear image, narrate the processing stages, then compare the detected violation with what is visibly present.

**Examiner caution:** Demonstrate image analysis explicitly. Short video capture/submission is a useful evidence feature, but do not claim full frame-by-frame video intelligence unless that exact behavior is visibly demonstrated.

### B. License-plate OCR

1. **What it does:** Attempts to detect and transcribe a visible vehicle registration plate.
2. **How it works conceptually:** The vision/OCR stages locate likely plate information and return a normalized text candidate linked to the report.
3. **Persona:** The citizen reviews the candidate; the officer verifies it against the evidence.
4. **Usefulness:** Makes reports searchable and more actionable while reducing typing mistakes.
5. **Academic value:** Adds a specific computer-vision/OCR task rather than using AI only as a generic chatbot.
6. **Viva demonstration:** Use a readable plate, show the extracted text, and state that blur, angle, lighting, and occlusion affect accuracy.

The correct claim is “OCR-assisted plate extraction.” It is not guaranteed recognition, official vehicle-owner lookup, or proof of identity.

### C. Supabase Realtime synchronization

1. **What it does:** Delivers report/status changes to the relevant interface without manual refresh.
2. **How it works conceptually:** **Citizen → Supabase → Realtime event → Officer dashboard**. The officer's decision then travels through the same cloud state back to the citizen.
3. **Persona:** Both personas benefit; it is most visible in the officer queue.
4. **Usefulness:** Reduces delay and makes the prototype feel operational.
5. **Academic value:** Demonstrates event-driven state synchronization rather than repeated polling.
6. **Viva demonstration:** Keep the officer queue open on a second device, submit as a citizen, and show the new report appearing without refresh.

### D. Points and rewards store

1. **What it does:** Converts accepted civic contributions into points and displays redeemable rewards.
2. **How it works conceptually:** An officer-approved report updates the contribution outcome; points accumulate and can unlock catalog items.
3. **Persona:** Primarily the citizen.
4. **Usefulness:** Encourages continued participation and provides visible acknowledgment.
5. **Academic value:** Adds behavioral/gamification design and closes the feedback loop.
6. **Viva demonstration:** Show balance before approval, approve one report, return to the citizen, and show the updated outcome/reward state.

This is primarily a **motivation mechanism**, not the enforcement mechanism. The report/review workflow must remain meaningful even without physical rewards.

### E. MapLibre violation-hotspot heatmap

1. **What it does:** Places approved report locations on a map and forms clusters/heat intensity where incidents accumulate.
2. **How it works conceptually:** Geographic coordinates from reviewed reports become GeoJSON points rendered by MapLibre layers.
3. **Persona:** Traffic officer.
4. **Usefulness:** Helps identify recurring problem areas and supports patrol, awareness, or infrastructure planning.
5. **Academic value:** Converts transactional report data into geospatial decision support.
6. **Viva demonstration:** Zoom from city-level clusters into a hotspot and explain what multiple approved reports at that location mean.

The map suggests where attention may be useful. It does not itself establish causation or authorize enforcement.

### F. Offline demo mode

1. **What it does:** Provides visibly synthetic sample data and a non-mutating demonstration path when internet or providers are unavailable.
2. **How it works conceptually:** The app builds a marked demo report and prevents it from being saved as a live citizen submission.
3. **Persona:** Both personas can be shown during evaluation.
4. **Usefulness:** Protects presentation continuity in unreliable campus-network conditions.
5. **Academic value:** Demonstrates resilience planning and separation between demonstration data and operational data.
6. **Viva demonstration:** Briefly enable it, point out the synthetic label, and state that it is a fallback—not evidence of a live cloud transaction.

Offline Demo Mode is **not** a fully offline production architecture. It does not imply a persistent offline queue, resumable synchronization, or conflict resolution.

## 4. Feature-to-persona matrix

| Feature | Citizen | Traffic Officer | AI | Realtime | Real-world Value |
|---|:---:|:---:|:---:|:---:|---|
| Photo/Video Capture | ✓ |  |  |  | Creates time/location-linked visual evidence |
| AI Vision | ✓ | ✓ | ✓ |  | Suggests observable violation information |
| License Plate OCR | ✓ | ✓ | ✓ |  | Reduces manual transcription and supports review |
| Violation Submission | ✓ |  |  | ✓ | Moves a structured report into the authority workflow |
| Incoming Queue |  | ✓ |  | ✓ | Supports timely operational review |
| Approval/Rejection |  | ✓ |  | ✓ | Preserves human authority and closes the report lifecycle |
| Points & Rewards | ✓ |  |  |  | Encourages useful civic participation |
| Rewards Store | ✓ |  |  |  | Makes the motivation mechanism tangible |
| Hotspot Heatmap |  | ✓ |  |  | Converts reviewed reports into planning insight |
| Offline Demo Mode | ✓ | ✓ |  |  | Improves prototype demonstrability under network risk |

These are not independent modules. Evidence capture supplies the AI stages; AI Vision and OCR produce review assistance; submission creates shared cloud state; realtime delivers it to the officer; officer approval gives the report meaning; the outcome returns to the citizen as status and points; approved locations contribute to the hotspot view. Offline Demo Mode mirrors this story when external connectivity is unreliable but remains clearly separated from live data.

## 5. Three-minute live demonstration script

### 0:00–0:20 — Problem

**Action:** Show the title/home screen, not a slide full of text.

**Say:** “Many traffic violations are witnessed by citizens but never become structured, reviewable information. Traffic Eye turns citizen-captured evidence into an AI-assisted report that a traffic officer can verify, while approved reports also reveal geographic hotspots. It supports official decision-making; it does not issue fines automatically.”

### 0:20–1:10 — Citizen demo

**0:20–0:30 — Open citizen reporting**  
**Action:** Open the citizen home and tap the report action.  
**Say:** “I am signed in as a citizen. This side of the app is designed for evidence capture, report tracking, and participation rewards.”

**0:30–0:42 — Capture/select evidence**  
**Action:** Select the prepared image with a clear violation and readable plate.  
**Say:** “The citizen can capture or select visual evidence. The app also attaches the incident location and shows the evidence before anything is submitted.”

**0:42–0:54 — AI Vision and OCR**  
**Action:** Start analysis and show the progress stages.  
**Say:** “The evidence is processed through server-managed AI stages. Vision suggests the visible violation, OCR attempts to read the registration plate, and the result is returned as decision support.”

**0:54–1:02 — Verify result**  
**Action:** Show the result and plate beside the image.  
**Say:** “The AI result is not treated as a legal decision. The citizen can inspect it now, and the officer will compare it with the original evidence before approval.”

**1:02–1:10 — Submit**  
**Action:** Tap submit once and show confirmation. Keep the officer queue already open on the second device.  
**Say:** “I am submitting one structured report to the cloud. Its status begins as pending; any reward for validity depends on officer review.”

### 1:10–2:15 — Officer demo

**1:10–1:24 — Realtime arrival**  
**Action:** Immediately show the second device's officer queue; do not refresh.  
**Say:** “This is the officer application. The citizen's report has appeared through Supabase Realtime without a manual refresh, demonstrating the connection between the two personas.”

**1:24–1:40 — Open evidence**  
**Action:** Open the newly arrived report.  
**Say:** “The officer receives the original evidence, location, reported violation, AI-assisted interpretation, and OCR plate in one review context.”

**1:40–1:55 — Explain human verification**  
**Action:** Zoom or point to the visible violation and plate.  
**Say:** “The officer checks whether the image really supports the suggested violation and whether the plate text matches. AI reduces review effort, but the human officer remains the final decision-maker.”

**1:55–2:07 — Approve**  
**Action:** Add a short remark and approve.  
**Say:** “I am approving this evidence. The report leaves the pending queue, its status is finalized, and the citizen receives the outcome.”

**2:07–2:15 — Citizen outcome**  
**Action:** Return briefly to the citizen device and show the status/notification and updated points.  
**Say:** “The citizen now has visible closure and receives points for the accepted contribution. The reward is an engagement mechanism, not a traffic penalty.”

### 2:15–2:45 — Heatmap

**Action:** Open the officer heatmap, show clusters, and zoom into one hotspot.

**Say:** “Approved reports also become geographic decision-support data. MapLibre groups repeated locations into clusters and heat intensity, helping an authority identify areas where awareness, patrols, or infrastructure investigation may be useful. A hotspot is an observed pattern, not automatic proof of cause.”

### 2:45–3:00 — Offline Demo Mode and closing

**Action:** Show the Demo Mode control and one clearly marked synthetic screen; do not restart the full flow.

**Say:** “If campus internet or an AI provider is unavailable, our clearly labeled Demo Mode preserves the presentation without writing synthetic evidence to the live workflow. Traffic Eye is therefore more than a reporting form: it connects citizen evidence, AI assistance, realtime officer verification, engagement, and geospatial insight in one human-centered system.”

## 6. Top-five viva questions and high-scoring answers

### 1. Examiner question

**“Why did you build Traffic Eye?”**

**Simple high-scoring answer:**  
“Citizens often witness traffic violations, but reporting can be unstructured and there may be no visible follow-up. We built Traffic Eye to convert captured evidence into a structured report, use AI to assist with violation and plate information, and deliver it to an officer for human verification. The aim is better participation and decision support, not automatic policing.”

**Key terms to mention:** citizen participation, structured evidence, decision support, human verification, road safety

**Examiner follow-up:** “Why not just send a photo through an existing complaint portal?”  
**Short answer:** “Traffic Eye adds AI-assisted extraction, a realtime officer queue, transparent status, rewards, and hotspot aggregation, so the evidence becomes part of a connected workflow rather than an isolated upload.”

### 2. Examiner question

**“How does your AI pipeline work?”**

**Simple high-scoring answer:**  
“The mobile app sends supported evidence to a server-controlled pipeline. A vision stage extracts visible traffic evidence, an OCR stage attempts the number plate, and an audit stage checks the structured result. Providers and timeouts are managed on the server. The output is advisory: uncertain evidence is flagged, and the officer checks the original image before deciding.”

**Key terms to mention:** computer vision, OCR, structured evidence, provider fallback, human-in-the-loop

**Examiner follow-up:** “What if one AI provider fails?”  
**Short answer:** “The server owns an ordered fallback chain. For temporary timeout, quota, or provider failures it can try another configured model/provider and return a safe failure if analysis remains unavailable.”

### 3. Examiner question

**“How does realtime synchronization work?”**

**Simple high-scoring answer:**  
“A citizen submission changes the shared report state in Supabase. The officer dashboard subscribes to relevant database changes through Supabase Realtime, so the new pending report can appear without polling or manual refresh. The same shared state carries the officer's approval or rejection back to the citizen experience.”

**Key terms to mention:** Supabase Realtime, subscription, database event, shared state, low latency

**Examiner follow-up:** “Why is realtime necessary?”  
**Short answer:** “It shortens the delay between reporting and review and demonstrates an operational two-user workflow. The application could poll, but that would be slower and less efficient.”

### 4. Examiner question

**“Why do you need two different user roles?”**

**Simple high-scoring answer:**  
“The roles represent different responsibilities. A citizen captures evidence, reviews the AI suggestion, submits, tracks status, and receives participation rewards. An officer manages an incoming queue, verifies the evidence and OCR result, makes the final decision, and studies hotspot patterns. Separating them keeps the workflow understandable and preserves human authority.”

**Key terms to mention:** role-specific UX, separation of responsibilities, citizen, officer, human decision

**Examiner follow-up:** “Could the citizen approve their own report?”  
**Short answer:** “No. Citizen contribution and officer verification are deliberately separate stages; otherwise the report would have no credible review step.”

### 5. Examiner question

**“What is the real-world impact and the main limitation?”**

**Simple high-scoring answer:**  
“Traffic Eye could make citizen evidence easier to structure, help officers prioritize reports, and reveal repeated violation locations. Its main limitation is that a university prototype has no legal enforcement authority and AI/OCR can be wrong. Real adoption would require government integration, operating procedures, privacy review, field validation, and trained human oversight.”

**Key terms to mention:** decision support, hotspot analysis, institutional integration, field validation, prototype limitation

**Examiner follow-up:** “Can this system issue a fine?”  
**Short answer:** “No. The prototype supports reporting and review. A fine requires official legal authority, verified identity/vehicle records, evidence standards, and an approved government process.”

## 7. Difficult examiner challenges

### Challenge 1: “Why should an officer trust an AI-generated violation?”

“The officer should not trust it blindly. Traffic Eye shows the original evidence together with the AI suggestion and confidence/uncertainty. AI is used for triage and data extraction; the officer verifies what is visible and makes the final decision. This keeps AI useful without treating it as an unquestionable authority.”

### Challenge 2: “What happens if OCR reads the number plate incorrectly?”

“The extracted plate is a candidate, not guaranteed truth. The citizen sees it during preview and the officer compares it with the evidence. Blur, viewing angle, glare, distance, and occlusion can reduce OCR quality. An uncertain or incorrect result should be corrected or rejected during human review.”

### Challenge 3: “Why do you need realtime synchronization?”

“The key project story involves two active personas. Realtime turns a citizen submission into an immediately visible officer task and returns the decision without repeated refreshes. It improves responsiveness and demonstrates event-driven cloud integration; it is not included merely as a visual effect.”

### Challenge 4: “What happens if two citizens report the same violation?”

“The system can use evidence and plate information to flag a possible duplicate, but it should not silently discard one report because the same vehicle could commit separate incidents. Time, location, plate, and evidence must be considered, and an officer should make the final judgment where duplication is uncertain.”

### Challenge 5: “Is this system actually capable of issuing traffic fines?”

“No. Traffic Eye is a reporting and decision-support prototype. Issuing fines would require official authority, legally admissible evidence rules, vehicle-owner databases, appeal processes, audit procedures, and government approval. Our academically valid contribution is the evidence-to-review workflow, not claiming powers the prototype does not have.”

## 8. Examiner's feature-maturity assessment

| Feature | Maturity | Examiner Reason |
|---|---|---|
| AI Vision | 🟢 **Core & Strong** | It is central to the report workflow and produces visible decision-support value, though measured field accuracy is still needed. |
| License Plate OCR | 🟡 **Prototype-Level** | It is meaningfully integrated, but real plates, angles, glare, fonts, and motion make accuracy validation essential. |
| Citizen Reporting | 🟢 **Core & Strong** | The journey from evidence/location through preview, submission, status, and rewards is coherent and user-centered. |
| Officer Review Workflow | 🟢 **Core & Strong** | It provides the necessary human verification and completes the two-persona lifecycle. |
| Realtime Queue | 🟢 **Core & Strong** | It visibly connects the citizen and officer experiences and strengthens the working-model demonstration. |
| Points & Rewards | 🔵 **Good Supporting Feature** | It closes the feedback loop and encourages participation without distracting from officer validation. |
| Rewards Store | 🟡 **Prototype-Level** | The catalog demonstrates redemption and gamification, but real fulfillment would require partners and operations. |
| MapLibre Heatmap | 🔵 **Good Supporting Feature** | It turns approved reports into geographic insight and is more than decorative mapping. |
| Offline Demo Mode | 🔵 **Good Supporting Feature** | It materially improves demonstration resilience, but it is not production offline synchronization. |

## 9. What makes this a capstone project?

### Why is Traffic Eye more than just a mobile application?

Traffic Eye is more than a collection of screens because each technical component transforms the same report through a complete system lifecycle:

- The **mobile application** captures evidence, location, user confirmation, and presents status.
- **AI computer vision** interprets visible traffic evidence.
- **OCR** extracts a candidate vehicle plate that is linked to the incident.
- The **cloud backend** stores evidence and maintains a shared report state.
- **Realtime data** connects the citizen's submission to the officer's operational queue.
- **Human verification** prevents the AI suggestion from becoming an automatic enforcement decision.
- **Gamification** returns value to the citizen and encourages continued participation.
- **Geospatial analytics** converts many reviewed incidents into hotspot patterns for planning.

The integration is meaningful because removing one central component changes the system's capability. Without mobile capture there is no evidence source; without the cloud there is no shared workflow; without AI/OCR there is less structured assistance; without the officer there is no credible decision; without realtime the two-persona interaction is weaker; without the heatmap the data remains a list rather than an aggregate planning signal. The components therefore cooperate around one problem instead of existing as unrelated features.

Academically, the project demonstrates system design across user experience, asynchronous cloud interaction, applied AI, event-driven updates, data lifecycle, role-oriented workflows, resilience, and responsible human oversight. That breadth and integration make it suitable for final-year evaluation.

## 10. Final examiner summary

### Top five strengths

1. A complete citizen-to-officer workflow with clear responsibilities for both personas.
2. AI Vision and OCR are applied to a specific real-world problem rather than added as a generic chatbot.
3. Human officer review is retained as the final decision point, making the concept more responsible and defensible.
4. Realtime queue updates create a convincing live systems demonstration.
5. Rewards, MapLibre hotspot analysis, and Offline Demo Mode extend the project beyond basic submission and make it memorable.

### Top three weaknesses or limitations

1. AI/OCR accuracy has not been presented as a measured field result across lighting, angle, blur, occlusion, and diverse plates.
2. The prototype has no government/legal integration and cannot issue fines or replace official enforcement procedures.
3. Rewards fulfillment and fully offline operation remain prototype concepts requiring partners and deeper operational infrastructure.

### Most impressive feature

The most impressive element is the **live two-persona loop**: a citizen submits AI-assisted evidence, it appears in the officer queue through realtime synchronization, the officer verifies and decides, and the outcome returns to the citizen while contributing to rewards and hotspot data. This single demonstration proves that the project is a connected system rather than a set of mock screens.

### Biggest viva risk

The greatest risk is overclaiming AI accuracy or legal authority. Saying that AI “detects the violation and issues a result” without emphasizing uncertainty and officer verification invites difficult questions the prototype cannot responsibly answer. The safe and technically strong formulation is: **AI assists, evidence is reviewed, and the human officer makes the final decision.**

### Recommended presentation strategy

1. Demonstrate one uninterrupted story across two devices; do not tour every menu.
2. Show the original evidence beside the AI and OCR output and explicitly acknowledge uncertainty.
3. Keep the officer queue visible before submission so realtime behavior is undeniable.
4. Use one prepared, readable evidence image and preloaded hotspot data; keep Offline Demo Mode ready but clearly label it if used.
5. End with real-world value and honest boundaries: decision support, human validation, no automatic fines, and further institutional validation required.

### Final verdict

**Score: 8.7/10**  
**Grade: A**

**Examiner verdict:** Traffic Eye demonstrates a sufficiently complete, technically meaningful, user-centered, and practically useful working model for a final-year capstone project. Its merit comes from integrating mobile evidence capture, AI Vision, OCR, cloud persistence, realtime officer workflow, human verification, gamification, and geospatial analytics around one coherent public-safety problem. The work is stronger than a routine mobile CRUD project and offers an effective live demonstration. The grade is not higher because model accuracy, field validation, reward operations, and institutional/legal adoption remain prototype limitations that must be presented honestly.
