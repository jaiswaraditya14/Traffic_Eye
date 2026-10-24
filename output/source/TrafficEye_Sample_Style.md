# TrafficEye: An Integrated Crowdsourced and AI-Assisted System for Traffic Violation Reporting and Enforcement

Meenakshi Garg, Shivam Chauhan, Mohit Jain, Aditya Jaiswar

Department of Information Technology, Vivekanand Education Society's Institute of Technology, Mumbai 400074, India

Correspondence: meenakshi.garg@ves.ac.in; 2025.shivam.chauhan@ves.ac.in; 2025.mohit.jain@ves.ac.in; 2025.aditya.jaiswar@ves.ac.in

## Abstract

Citizen-submitted photographs and videos can document traffic violations beyond the reach of fixed cameras, but each report still requires interpretation and verification. TrafficEye is a prototype that connects mobile evidence capture to an officer review interface. It records location from device GPS or available image metadata, stores evidence and report data in a managed cloud backend, and uses a pretrained vision-language model to propose a vehicle description, violation category, licence-plate string, and severity label. The reporter can check the information before submission; an officer reviews the original media and may confirm, correct, or reject the resulting report. This paper describes the integrated workflow and its implementation boundaries. It does not claim that the generated fields are accurate or that they reduce review time: application-specific testing has not yet been completed. A proposed evaluation will compare model outputs with independently labelled traffic images and clips, including difficult capture conditions. TrafficEye's contribution is a citizen-to-officer reporting design with AI-assisted triage and retained human authority, rather than a new recognition algorithm.

**Keywords:** Traffic violation reporting · Mobile crowdsourcing · Vision-language models · Automatic number plate recognition · Geolocation · Human-in-the-loop AI · Intelligent transportation systems

## 1 Introduction

Fixed cameras and police patrols cannot observe every road event. Reports from road users offer another source of evidence, as crowdsourced traffic and road-safety systems have demonstrated [1–4]. Indian police applications already accept citizen-submitted media for verification [5, 6]. Yet a photograph and location alone do not tell a reviewer which vehicle is involved, what violation is alleged, or whether a plate is legible. Manual entry places much of that work on the reporter; manual interpretation shifts it to the reviewing officer.

TrafficEye connects capture, metadata handling, visual interpretation, and officer verification in one prototype. A hosted vision-language model (VLM) generates candidate fields, not enforcement decisions. The system-level contribution is the workflow and its explicit separation of machine suggestions from officer judgement. Recognition quality, review-time savings, and operational suitability remain open questions.

The following sections describe the reporting workflow, location handling, backend integration, and inference process, then set out the planned evaluation and the prototype's limitations.

<!-- PAGE BREAK -->

## 2 Related Work

### 2.1 Citizen Reporting and Road Safety

RoadCop separates incoming citizen reports from expert evaluation and includes spam screening [1]. CrowdOut supports mobile offence reporting and map-based presentation [2]. Mobile Roadwatch attaches time and location to smartphone video before a user selects an event to report [7]. These systems show how media and context can enter a review process; none of those descriptions establishes that every visual field required by TrafficEye is extracted automatically. Work on reported danger spots [3] and smartphone sensing of hazardous road sections [4] addresses wider road-safety observation rather than the interpretation of an individual alleged offence.

Delhi's Traffic Prahari requests the date, time, location, registration number, and violation type alongside a photograph or video, subject to police verification [5]. The Mumbai Traffic Police app also provides a citizen-reporting route [6]. TrafficEye follows the same principle of authority-led review while proposing machine-generated fields for the initial report. The cited product descriptions do not establish that those services lack similar features; the distinction here is the documented integration in this prototype.

### 2.2 Visual Interpretation

Task-specific methods approach interpretation differently. Srivastava et al. combine YOLOv5 with EasyOCR for Indian number plates [8], while Deshpande et al. describe a staged helmet-violation and vehicle-identification pipeline [9]. Surveys of automatic number plate recognition (ANPR) describe the effects of detection, OCR, image quality, viewpoint, and environmental conditions on evaluation [10, 11]. These studies provide task definitions and measurement criteria; their reported performance cannot be transferred to TrafficEye. A single prompted VLM avoids training a project-specific detector but gives the application less control over each output field. Surveys of vision-language and multimodal models [12, 13] motivate this reusable inference approach, and the hosted API documents image input [14], but none verifies its traffic-enforcement accuracy.

### 2.3 Human Review and Acceptance

Public acceptance and governance matter as much as interface design. Privacy, perceived penalty fairness, and trust in police influence acceptance of crowdsourced enforcement [15]. A review of AI use in law enforcement stresses human involvement and accountability [16]. Accordingly, TrafficEye presents original evidence with the suggested fields and leaves confirmation to an officer.

These studies motivate combining submission, location context, candidate visual fields, and officer review. Comparative claims about accuracy or efficiency would require experiments against defined alternatives.

<!-- PAGE BREAK -->

## 3 Problem Statement

The engineering problem is to convert heterogeneous citizen media into a structured report that an officer can verify against the original evidence. The report must connect the alleged violation, vehicle information, visible plate text, location, and review status without presenting an automated interpretation as an established fact. Three linked constraints define the problem.

1. Evidence and context: citizen submissions vary in framing, media quality, and available metadata. Manual reporting requires the user to identify a vehicle, describe an alleged violation, transcribe a plate, and supply location information. Missing or inconsistent fields leave additional work for the reviewer.

2. Interpretation and verification: officers must examine the media, resolve ambiguous categories, check plate legibility, and determine whether the submitted context is credible. Pre-filled fields can support this work only if reviewers can inspect and correct them alongside the evidence.

3. Integration and model choice: specialised plate and violation pipelines require separate development and evaluation [8–11]. A pretrained VLM offers a shared inference component [12–14], but its general capabilities do not establish reliability for these traffic tasks. Any generated field therefore requires application testing and human verification.

TrafficEye addresses the integration gap between evidence capture, location handling, candidate interpretation, and officer decisions. Its intended benefit is reduced initial data entry and triage effort. The extent of that benefit remains an empirical question.

## 4 Methodology and Workflow

The reporter follows a capture–check–submit sequence. The mobile client accepts a live photograph or video, or existing media. It obtains device GPS coordinates for live capture and reads available EXIF fields from gallery images. The reporter checks the location and proposed report details before submission. The backend stores the evidence and metadata; hosted inference returns candidate fields for the report. In the officer interface, the submitted media remains visible beside those fields. An officer can confirm, edit, or reject the submission, and the shared report status is updated.

This workflow distinguishes a citizen's allegation, a model's interpretation, and an officer's decision. The interpretation stage assists preparation of the report, while the reviewing officer retains responsibility for checking the evidence [16]. A severity label serves as a queue-organising field and requires the same scrutiny as a candidate violation or plate string. The architecture supporting this interaction is described in the next section.

<!-- PAGE BREAK -->

## 5 System Architecture

TrafficEye connects a Citizen Reporting Interface and a Traffic Officer Command Center through a managed cloud backend. The citizen interface handles evidence selection and location checks. The backend maintains media objects and relational report data, invokes hosted visual inference, and synchronizes report changes with the officer interface. Figure 1 shows the relationship among these components.

The media-storage path and the analysis path contribute to the same report. The stored evidence provides the material that an officer reviews, while the inference response supplies candidate fields that can be confirmed or corrected. A report associates those fields with location context and submission status. Keeping them connected allows the reviewer to inspect the interpretation in the context of the submission rather than as an isolated model response.

Backend subscriptions bring new submissions into the officer queue and reflect subsequent status changes in the citizen-facing workflow. The database supports querying report records by status, location, and severity. The architecture is designed to handle concurrent submissions, but throughput and scalability have not been established by formal load tests. The diagram describes the implemented component relationships; it does not imply a measured capacity or deployment-scale validation.

[[FIGURE 1 SPACE]]

**Fig. 1.** TrafficEye system architecture linking citizen reporting, cloud storage, VLM inference, and officer verification.

<!-- PAGE BREAK -->

## 6 Implementation

### 6.1 Mobile Capture and Location

The mobile client uses React Native with Expo for Android and iOS and accesses camera, location, and local media. For live capture, it records device coordinates. For gallery images, it reads any available EXIF geotags, capture time, and device information and compares the stored position with the device's current position as a plausibility check. EXIF may be missing, stripped, or edited, so neither it nor the comparison proves where a photograph was taken. The reporter can inspect the displayed location before submission.

### 6.2 Report Storage and Inference

The backend uses Supabase with PostgreSQL report records and cloud object storage for media. Database-change subscriptions update the officer queue when new reports arrive or statuses change. Upload and remote inference require network access, so interrupted connectivity can delay or prevent submission. The prototype's concurrency and backend response behaviour still require load testing. Storage access controls and deployment configuration must be assessed separately; the workflow alone does not establish that evidence is immutable or securely restricted.

Before inference, the system compresses and normalizes submitted evidence. Images or selected video frames are sent to a hosted multimodal model with a task-specific request for structured output; Gemini provides one documented image-input API [14]. The response is parsed into a vehicle description, candidate violation, plate string, and a configured severity category (Low, Medium, High, or Critical). Plate extraction may use the same response or a follow-up call. Structured fields include vehicle type and colour, violation category, plate text, and severity; these values remain editable during review. Figure 2 outlines this processing sequence.

TrafficEye uses inference only and does not train, fine-tune, or modify the pretrained model. It has no model-training dataset or associated training split. This design avoids a dedicated training pipeline, while retaining dependence on the hosted model and prompt configuration. Officers can confirm, correct, or reject the report after examining the submitted media.

[[FIGURE 2 SPACE]]

**Fig. 2.** TrafficEye inference pipeline from submitted media to structured candidate fields and officer review.

<!-- PAGE BREAK -->

## 7 Planned Evaluation

### 7.1 Evaluation Collection and Reference Labels

The planned evaluation will use approximately 50–100 traffic images and short clips from Mumbai covering no helmet, red-light running, wrong parking, and lane obstruction. This evaluation collection will include glare, low light, rain reflections, oblique viewpoints, and partially obscured plates. Three project members will independently label vehicle presence and attributes, violation category, visible plate text, and severity, then resolve disagreements by consensus. Model and prompt settings will remain fixed. Sample size, category balance, and labelling rules must be finalized before testing; no training or completed experiment is reported.

Ambiguous events or unreadable plates should be marked before inference. Project-member consensus provides reference labels but does not establish officer agreement or enforcement suitability, especially for subjective severity categories.

### 7.2 Field-Level Measures

Violation-classification accuracy will be accompanied by class-wise precision, recall, and macro-averaged F1. Vehicle-presence recall and vehicle-category and colour precision/recall are also proposed. Rules for matching descriptions to reference vehicles must be fixed before measurement, particularly in multi-vehicle scenes.

Plate evaluation will report exact string agreement and character error rate (CER). CER = (S + D + I) / N, where S, D, and I are the substitutions, deletions, and insertions needed to align predicted and reference text, and N is the reference-character count. One wrong character prevents an exact match. ANPR surveys provide evaluation context [10, 11]; rules for spaces, punctuation, unreadable plates, and missing outputs must also be specified.

Severity evaluation will use raw agreement and the proposed quadratic-weighted Cohen's kappa against consensus labels. The ordered categories, labelling criteria, and disagreement procedure must be defined. Agreement does not by itself validate the labels against police priorities or legal seriousness.

### 7.3 Interpretation of the Planned Results

The model and prompt configuration should be recorded, and difficult capture conditions reported separately where sample counts permit. General VLM benchmarks cannot substitute for these measurements [12, 13]. The proposed sample size limits conclusions across classes and environmental conditions. Later operational tests can measure correction frequency, review time, and reporting completion using a defined comparison workflow and representative users.

<!-- PAGE BREAK -->

## 8 Results and Discussion

The present result is an integrated prototype: a citizen can submit media with location context, the backend can prepare a structured report using hosted visual inference, and an officer can inspect and act on that report. The implemented reporting and review flow is the basis for the proposed evaluation. Figures 3 and 4 illustrate the officer queue and an example review screen. Interface examples illustrate available fields; they do not constitute measured accuracy or calibrated confidence results.

The prototype connects report preparation to human verification, but its effectiveness in traffic enforcement remains unmeasured. No domain-specific accuracy, vehicle recall, plate-recognition score, severity agreement, reporting-completion rate, or officer time saving has been established. Low light, rain, motion blur, obstructed plates, and ambiguous events may produce incorrect or incomplete suggestions [10–13]. General multimodal capability does not resolve those application-specific reliability questions.

The current location check is not tamper-proof, automatic bystander anonymization is absent, and poor connectivity can interrupt the workflow. Privacy, perceived fairness, and trust must be considered alongside recognition performance [15]. Officer verification remains central because a generated field can look convincing while misrepresenting the evidence [16]. Future testing should record how often officers correct or reject suggestions and whether pre-filled fields help or hinder review.

[[FIGURES 3 AND 4 SPACE]]

**Fig. 3.** Prototype officer queue showing pending reports and review-oriented filtering.

**Fig. 4.** Prototype AI-assisted review screen with candidate violation and plate fields available for officer correction.

<!-- PAGE BREAK -->

## 9 Conclusion

TrafficEye brings citizen media capture, location context, cloud report handling, and pretrained visual inference into one officer-reviewed reporting workflow. Its contribution is the integration of these functions and the clear boundary between candidate machine output and an officer's decision. The prototype demonstrates the workflow; it does not yet demonstrate reliable recognition or a reduction in review effort. Those claims depend on the planned evaluation.

## 10 Future Work

The first priority is to complete the labelled, domain-specific evaluation and measure both field accuracy and officer correction effort under varied capture conditions. Subsequent work can add precinct or radius-based queues, a city-wide heatmap, stronger location checks, automatic masking of bystanders and unrelated vehicles, and backend load tests. A location-confidence score would need independent validation before evidentiary use. Registration lookup, evidence-linked digital challans, and owner notification would require authorized integration with the relevant public systems; these functions are proposals, not current features.

## Acknowledgments

The authors thank Vivekanand Education Society's Institute of Technology, Mumbai, for academic support and resources.

## Disclosure of Interests

The authors declare no competing interests relevant to this article.

## References

1. Jameela, M., Afzal, H., Khurshid, K., Malik, A.W.: Crowdsourced system to report traffic violations—RoadCop: bi-modular system. In: VEHITS 2018, pp. 315–322 (2018). https://doi.org/10.5220/0006680303150322
2. Aubry, E., Silverston, T., Lahmadi, A., Festor, O.: CrowdOut: a mobile crowdsourcing service for road safety in digital cities. In: PerCom Workshops, pp. 86–91. IEEE (2014). https://doi.org/10.1109/PerComW.2014.6815170
3. Olma, J., Bode, T., Ehlers, J., Sutter, C.: Road users' reports on danger spots: the crowd as an underestimated expert? Safety 8(4), 70 (2022). https://doi.org/10.3390/safety8040070
4. Dunlop, M.D., Roper, M., Elliott, M., McCartan, R., McGregor, B.: Using smartphones in cities to crowdsource dangerous road sections and give effective in-car warnings. In: SEACHI 2016, pp. 14–18. ACM (2016). https://doi.org/10.1145/2898365.2899796
5. Delhi Traffic Police: Traffic Prahari citizen reporting. Delhi Traffic Police Newsletter (Apr 2025). https://www.traffic.delhipolice.gov.in/sites/default/files/uploads/2025/NEWSLETTER-APRIL-2025.pdf

<!-- PAGE BREAK -->

6. Mumbai Traffic Police: Mumbai Traffic Police App (MumTrafficapp). Apple App Store. https://apps.apple.com/in/app/mumbai-traffic-police-app/id1450958843 (accessed 4 Oct 2026)
7. Korea Advanced Institute of Science and Technology: Improving traffic safety with a crowdsourced traffic violation reporting app (Mobile Roadwatch). EurekAlert (2017). https://www.eurekalert.org/news-releases/763943
8. Srivastava, A., Narote, P., Fatangare, S., Kakade, S., Kulkarni, R.: Automatic number plate detection system for Indian vehicles using YOLOv5 and EasyOCR. In: Soft Computing for Problem Solving, pp. 305–314. Springer (2024). https://doi.org/10.1007/978-981-97-3292-0_21
9. Deshpande, U.U., et al.: Computer-vision based automatic rider helmet violation detection and vehicle identification in Indian smart city scenarios using NVIDIA TAO toolkit and YOLOv8. Front. Artif. Intell. 8, 1582257 (2025). https://doi.org/10.3389/frai.2025.1582257
10. Shashirangana, J., Padmasiri, H., Meedeniya, D., Perera, C.: Automated license plate recognition: a survey on methods and techniques. IEEE Access 9, 11203–11225 (2021). https://doi.org/10.1109/ACCESS.2020.3047929
11. Xu, L., Shang, Z., Chen, X., Zeng, T., Dai, W., Zhao, J.: Deep learning algorithms for license plate recognition: a review. Neural Networks 200, 108842 (2026). https://doi.org/10.1016/j.neunet.2026.108842
12. Zhang, J., Huang, J., Jin, S., Lu, S.: Vision-language models for vision tasks: a survey. IEEE Trans. Pattern Anal. Mach. Intell. 46(8), 5625–5644 (2024). https://doi.org/10.1109/TPAMI.2024.3369699
13. Caffagni, D., et al.: The revolution of multimodal large language models: a survey. In: Findings of ACL 2024, pp. 13590–13618 (2024). https://doi.org/10.18653/v1/2024.findings-acl.807
14. Google: Gemini API: image understanding. Google AI for Developers. https://ai.google.dev/gemini-api/docs/image-understanding (accessed 4 Oct 2026)
15. Khojastehpour, M., Sahebi, S., Samimi, A.: Public acceptance of a crowdsourcing platform for traffic enforcement. Case Stud. Transp. Policy 10(4), 2012–2024 (2022). https://doi.org/10.1016/j.cstp.2022.08.013
16. Dasgupta, R., Mekala, S.H., Jaigirdar, F.T., Anwar, A., Chang, L.Y.-C.: Unlocking Australia's AI usage in law enforcement from human involvement perspective: a systematic literature review. AI & Society 40, 6543–6570 (2025). https://doi.org/10.1007/s00146-025-02350-6
