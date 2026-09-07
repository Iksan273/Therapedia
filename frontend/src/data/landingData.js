// Data source directly extracted from official website https://therapedia.center/
// Therapedia Center: Pediatric Occupational Therapy & Sensory Integration Center, Surabaya

export const CLINIC_INFO = {
  name: "Therapedia Center",
  tagline: "Pediatric Occupational Therapy Center",
  heroSubtitle:
    "Therapedia is a pediatric occupational therapy center in Surabaya dedicated to supporting children with developmental challenges. We provide personalized, evidence-based therapy through approaches like Sensory Integration and Neurodevelopmental Treatment, helping children grow, thrive, and reach their full potential.",
  email: "admin@therapedia.center",
  instagram: "https://www.instagram.com/therapediacenter/",
  facebook: "https://www.facebook.com/therapediadc",
  whatsappNumber: "6281234567890", // Official booking channel
  accreditation: "Certified Clinical Practice (SI & NDT)",
  version: "Version: 1.2.1 (Crest)",
  copyrightYear: 2025
};

export const CLINICAL_PILLARS = [
  {
    id: "experienced-team",
    title: "Experienced Team",
    desc: "Our certified pediatric occupational therapists use evidence-based approaches like Sensory Integration and Neurodevelopmental Treatment.",
    badge: "Certified OT & SI",
    iconName: "UserCheck",
    color: "from-blue-600/15 to-cyan-500/15 text-blue-600 border-blue-200/80"
  },
  {
    id: "commitment-growth",
    title: "Commitment to Growth",
    desc: "We believe in every child's potential and are dedicated to supporting meaningful progress step by step through measurable milestones.",
    badge: "Step-by-Step",
    iconName: "TrendingUp",
    color: "from-sky-500/15 to-blue-600/15 text-sky-600 border-sky-200/80"
  },
  {
    id: "family-centered",
    title: "Family-Centered Approach",
    desc: "We actively involve parents and caregivers to ensure progress continues at home and in daily family routines with regular guidance.",
    badge: "Home Carryover",
    iconName: "HeartHandshake",
    color: "from-indigo-500/15 to-blue-500/15 text-indigo-600 border-indigo-200/80"
  },
  {
    id: "personalized-therapy",
    title: "Personalized Therapy",
    desc: "Every child receives individualized therapy plans based on thorough clinical assessment and unique sensory and developmental needs.",
    badge: "Customized Plan",
    iconName: "FileCheck2",
    color: "from-cyan-500/15 to-teal-500/15 text-cyan-700 border-cyan-200/80"
  }
];

export const CLINICAL_PROGRAMS = [
  {
    id: "regular-ot",
    title: "Regular Occupational Therapy Intervention",
    shortTitle: "Regular Occupational Therapy",
    ageGroup: "18 Months – 14 Years",
    category: "Core Clinical Intervention",
    image: "https://therapedia.center/uploads//CMS/Program/71cd1f3b-7a30-4d8c-94d2-26dcbc7fffc9.jpg",
    desc: "We provide regular occupational therapy for children aged 18 months to 14 years, supporting their developmental milestones through every stage of growth.",
    fullDesc:
      "Our Regular Occupational Therapy Intervention targets gross motor coordination, fine motor dexterity, bilateral integration, attention span, and emotional regulation. Using specialized sensory gyms with suspended swings, textured surfaces, and therapeutic obstacle courses, children develop independent daily living skills (dressing, writing, eating, social play) under the direct supervision of licensed occupational therapists.",
    benefits: [
      "Sensory integration modulation (calming vestibular/proprioceptive systems)",
      "Fine motor precision & pencil grip readiness",
      "Executive functioning, focus & task transition skills",
      "Self-care independence (ADL - Activities of Daily Living)",
      "Active parent progress consultations & home exercise program"
    ]
  },
  {
    id: "sensory-spark",
    title: "Sensory Spark Early Prevention",
    shortTitle: "Sensory Spark (Early Stimulation)",
    ageGroup: "9 – 24 Months",
    category: "Preventive Developmental Care",
    image: "https://therapedia.center/uploads//CMS/Program/c30c1a7b-a360-40b7-a2f2-8086d2a95525.jpg",
    desc: "Sensory Spark is a preventive program for infants and toddlers aged 9–24 months, aimed at stimulating early sensory pathways and preventing developmental delays.",
    fullDesc:
      "The first 1,000 days are crucial for neural plasticity. Sensory Spark utilizes gentle, play-based sensory stimulation designed for infants and young toddlers. Parents actively participate in each session to learn how to identify sensory cues, facilitate tummy time, encourage crawling and cruising, and build strong emotional attachment that fosters lifelong brain development.",
    benefits: [
      "Early detection of sensory defensiveness or hypotonia",
      "Vestibular & proprioceptive exploration in baby-safe environments",
      "Social-emotional responsiveness & parent-infant bonding",
      "Milestone tracking for rolling, sitting, crawling, and walking",
      "Practical coaching for parents on sensory play at home"
    ]
  },
  {
    id: "eibi-developmental",
    title: "Early Intensive Behavioral Intervention (EIBI)",
    shortTitle: "EIBI & Behavioral Support",
    ageGroup: "2 – 7 Years",
    category: "Specialized Behavioral Support",
    image: "https://therapedia.center/uploads//CMS/Branch/a57b37d5-7361-4aa7-9c81-9f1bbde9f5e7.jpeg",
    desc: "Supervised by certified psychologists and behavior analysts, providing structured 1-on-1 intervention for communication, joint attention, and classroom readiness.",
    fullDesc:
      "Designed for young children on the autism spectrum or with developmental social communication challenges. EIBI breaks down complex behaviors into manageable learning units with positive reinforcement, helping children build imitation, functional communication, reciprocal play, and self-regulation.",
    benefits: [
      "Supervised directly by Master of Psychology clinical specialists",
      "Individualized discrete trial and naturalistic behavioral teaching",
      "Functional communication training (FCT) & reduced meltdowns",
      "Pre-academic and preschool inclusion readiness",
      "Comprehensive monthly developmental progress reports"
    ]
  }
];

export const CLINICAL_TEAM = [
  {
    id: "aditya-agus",
    name: "Aditya Agus Setyawan, A.Md.OT.",
    role: "Founder & Clinical Director",
    department: "Executive & Clinical Direction",
    branch: "All Branches",
    image: "https://therapedia.center/uploads//CMS/Team/ef264958-20ce-4fee-aa34-ee634cc43190.jpg",
    bio: "Certified pediatric occupational therapist with extensive experience in Sensory Integration and Neurodevelopmental Treatment. Leads Therapedia's clinical standards, therapist mentoring, and treatment methodologies across all centers.",
    specialties: ["Sensory Integration (SI)", "Clinical Direction", "NDT Approach", "Pediatric OT Assessment"]
  },
  {
    id: "tiara-shinta",
    name: "Tiara Shinta",
    role: "Operational Director",
    department: "Operations & Center Management",
    branch: "All Branches",
    image: "https://therapedia.center/uploads//CMS/Team/15ed0da6-d078-4d7b-abad-64b4762e57a4.jpg",
    bio: "Directs organizational operations, service quality assurance, multisite coordination, and parent partnership frameworks to ensure every family receives world-class care.",
    specialties: ["Healthcare Operations", "Service Quality Assurance", "Family Relations"]
  },
  {
    id: "mikhael-ivan",
    name: "Mikhael Ivan Mintoro, S.Psi.",
    role: "Sensory Integration Therapist",
    department: "Clinical Therapy",
    branch: "East Branch",
    image: "https://therapedia.center/uploads//CMS/Team/7d5e9f88-5154-453c-8a1d-b5176adadf30.jpg",
    bio: "Specializes in sensory processing evaluation and therapeutic play interventions for children with sensory modulation difficulties, ADHD, and emotional regulation challenges.",
    specialties: ["Sensory Processing", "Behavioral Regulation", "Therapeutic Play"]
  },
  {
    id: "sahwa-zulfa",
    name: "Sahwa Zulfa Talitha Putri, A.Md.Kes.",
    role: "Clinical Coordinator",
    department: "Clinical Leadership",
    branch: "West Branch",
    image: "https://therapedia.center/uploads//CMS/Team/477d831d-5c89-41f3-84fe-c22a3a2c4519.jpg",
    bio: "Clinical coordinator ensuring high fidelity in therapy sessions, individualized program delivery, and clinical outcome measurements at West branch.",
    specialties: ["Clinical Supervision", "Occupational Therapy", "Pediatric Rehabilitation"]
  },
  {
    id: "hana-mufidah",
    name: "Hana Mufidah, S.Tr.Kes.",
    role: "Clinical Coordinator",
    department: "Clinical Leadership",
    branch: "Citraland Branch",
    image: "https://therapedia.center/uploads//CMS/Team/76b8ffb9-f4b3-4668-bb4a-90099d9abde0.jpg",
    bio: "Leads clinical case conferences, child intake assessments, and therapist collaboration at the Citraland center.",
    specialties: ["Neurodevelopmental Treatment", "Clinical Coordination", "Early Motor Milestones"]
  },
  {
    id: "ivonne-rebecca",
    name: "Ivonne Rebecca, M.Psi., Psikolog.",
    role: "EIBI Program Supervisor",
    department: "Psychology & Behavioral Science",
    branch: "All Branches",
    image: "https://therapedia.center/uploads//CMS/Team/168a5622-ffc6-4172-a3de-c3238e42072d.jpg",
    bio: "Licensed Child Psychologist supervising the Early Intensive Behavioral Intervention (EIBI) program, cognitive assessments, and behavioral adaptation strategies.",
    specialties: ["Child Psychology", "EIBI Supervision", "Behavior Modification", "Developmental Diagnostics"]
  },
  {
    id: "aliefia-khairah",
    name: "Aliefia Khairah Lisanah Papilaya, A.Md.Kes.",
    role: "Occupational Therapist",
    department: "Clinical Therapy",
    branch: "West Branch",
    image: "https://therapedia.center/uploads//CMS/Team/eeb80ac1-b465-4142-b65f-439b259c2c41.jpg",
    bio: "Dedicated pediatric occupational therapist focusing on fine motor coordination, school readiness, and sensory modulation.",
    specialties: ["Fine Motor Development", "Handwriting Readiness", "Sensory Integration"]
  },
  {
    id: "zia-daturrifah",
    name: "Zi'a Daturrif'ah, A.Md.Kes.",
    role: "Occupational Therapist",
    department: "Clinical Therapy",
    branch: "East Branch",
    image: "https://therapedia.center/uploads//CMS/Team/75a59637-924a-4153-873f-9e819cf4c6ef.jpg",
    bio: "Experienced in motor planning (praxis), sensory diet design, and adaptive daily living skill training for pediatric clients.",
    specialties: ["Motor Planning & Praxis", "Sensory Diet", "Activities of Daily Living"]
  },
  {
    id: "nur-rahmah",
    name: "Nur Rahmah Ramadani, S.Psi.",
    role: "Sensory Integration Therapist",
    department: "Clinical Therapy",
    branch: "West Branch",
    image: "https://therapedia.center/uploads//CMS/Team/2d75f83c-7615-4f4e-b6ef-3df946497be7.jpg",
    bio: "Applies psychology-informed sensory integration techniques to enhance frustration tolerance, attention span, and interactive play.",
    specialties: ["Sensory Stimulation", "Emotional Regulation", "Child Motivation"]
  },
  {
    id: "al-haviz",
    name: "Al Haviz Dwi Panca, S.Psi.",
    role: "Sensory Integration Therapist",
    department: "Clinical Therapy",
    branch: "East Branch",
    image: "https://therapedia.center/uploads//CMS/Team/306a6f51-9527-47f9-aaea-db1e65d4b090.jpg",
    bio: "Expertise in vestibular-proprioceptive stimulation, energetic sensory motor play, and behavioral engagement for children with hyperactivity.",
    specialties: ["Vestibular Therapy", "Sensory-Motor Play", "Attention Training"]
  },
  {
    id: "dian-swanti",
    name: "Dian Swanti, S.Psi.",
    role: "Operational Coordinator & SI Therapist",
    department: "Clinical Therapy & Operations",
    branch: "East Branch",
    image: "https://therapedia.center/uploads//CMS/Team/47c7b356-8961-4cdb-9c8e-2f9c156836d2.jpg",
    bio: "Combines operational coordination with frontline sensory integration therapy to maintain high clinical and parent satisfaction standards.",
    specialties: ["SI Therapy", "Family Counseling", "Branch Clinical Flow"]
  },
  {
    id: "glory-ketshia",
    name: "Glory Ketshia Alase, S.Psi.",
    role: "Sensory Integration Therapist",
    department: "Clinical Therapy",
    branch: "Citraland Branch",
    image: "https://therapedia.center/uploads//CMS/Team/296c6ba5-c01a-4166-b8b9-b7855d941584.jpeg",
    bio: "Focuses on sensory integration, cooperative play therapy, and emotional self-regulation skills in the Citraland sensory gym.",
    specialties: ["Social Communication", "Sensory Integration", "Peer Play"]
  }
];

export const CLINICAL_BRANCHES = [
  {
    id: "rungkut",
    name: "EAST BRANCH",
    shortName: "East",
    area: "East",
    address: "Ruko Rungkut Megah Raya Blok L-1, Kota Surabaya",
    hours: "Senin – Sabtu: 08.00 – 17.00 WIB",
    phone: "+62 812-3456-7890",
    mapUrl: "https://maps.app.goo.gl/9vHg3QHqsaDUB5M7A",
    facilities: ["Sensory Gym Room", "Gross Motor Area", "Individual Assessment Room", "Parent Lounge"],
    photos: [
      "https://therapedia.center/uploads//CMS/Branch/d9c4627f-9d1e-479c-88aa-f17a177eb72e.png",
      "https://therapedia.center/uploads//CMS/Branch/06930fe6-9079-4833-995b-399418892ea1.png",
      "https://therapedia.center/uploads//CMS/Branch/ce57425a-73d4-48ac-99d0-8ccaa3e35b23.png",
      "https://therapedia.center/uploads//CMS/Branch/93c72565-f136-4a72-9dc8-cad7270f293a.png"
    ]
  },
  {
    id: "sungkono",
    name: "WEST BRANCH",
    shortName: "West",
    area: "West",
    address:
      "Lagoon Avenue Mall Sungkono Lt UG 3 - 6, Jalan K.H. Abdul Wahab Siamin Blok RA 9 - 10, Kota Surabaya",
    hours: "Senin – Minggu: 09.00 – 18.00 WIB",
    phone: "+62 812-3456-7891",
    mapUrl: "https://maps.app.goo.gl/wZxPV63DR3DCazeu7",
    facilities: ["Mall-Integrated Accessibility", "Sensory Spark Infant Room", "Dynamic Sensory Gym", "Spacious Waiting Area"],
    photos: [
      "https://therapedia.center/uploads//CMS/Branch/a57b37d5-7361-4aa7-9c81-9f1bbde9f5e7.jpeg",
      "https://therapedia.center/uploads//CMS/Branch/c9771dab-93d6-4753-aa5e-de28d4f96338.jpeg",
      "https://therapedia.center/uploads//CMS/Branch/b368b561-087e-4a37-8ba4-5e0398b11f78.jpeg",
      "https://therapedia.center/uploads//CMS/Branch/75edac03-79a0-443e-9372-6d7be98b2573.jpeg"
    ]
  },
  {
    id: "citraland",
    name: "CITRALAND BRANCH",
    shortName: "Citraland",
    area: "Citraland",
    address: "Royal Park TK II No. 21 - 22, Citraland, Lakarsantri, Kota Surabaya",
    hours: "Senin – Sabtu: 08.00 – 17.00 WIB",
    phone: "+62 812-3456-7892",
    mapUrl: "https://maps.app.goo.gl/WqS7pt9NRijq2fTCA",
    facilities: ["Calm Residential Environment", "Multi-Sensory Therapy Hall", "Behavioral EIBI Unit", "Private Consultation Pod"],
    photos: [
      "https://therapedia.center/uploads//CMS/Branch/46310ead-dab0-45a0-82f0-54bc0befae5d.jpeg",
      "https://therapedia.center/uploads//CMS/Branch/164bed45-42db-4410-a3da-d8a48e76d85d.png",
      "https://therapedia.center/uploads//CMS/Branch/e8e16ade-410b-47a4-a59b-9013fb56269a.png",
      "https://therapedia.center/uploads//CMS/Branch/65c82cea-cac6-4ae2-a3a9-a3a6c247394c.png"
    ]
  }
];

export const KNOWLEDGE_ARTICLES = [
  {
    id: "when-is-tiptoeing-normal",
    title: "When is Tip-Toeing Normal?",
    category: "Cases",
    categoryColor: "bg-red-500/10 text-red-600 border-red-200",
    date: "Aug 06, 2025",
    image: "https://therapedia.center/uploads/Knowledge//15d1d999-3936-44f7-b1b2-bf10326a8fc6.jpeg",
    excerpt:
      "As a parent, watching your child grow and reach developmental milestones is a joyful experience. But sometimes, you may notice something unusual — for example, your child often walks on their toes...",
    content:
      "Tip-toeing (toe walking) is relatively common in toddlers who are just learning to walk between 10 and 18 months as they experiment with balance. However, when toe walking persists past age 2 or 3, or if the child is unable to place their heels flat on the floor, it warrants clinical assessment. In pediatric occupational therapy, persistent toe-walking may relate to sensory processing differences (tactile sensitivity on foot soles, seeking intense vestibular input) or musculoskeletal tightness such as shortened Achilles tendons. An occupational therapy evaluation differentiates between sensory-seeking habits and motor tightness to provide gentle, playful intervention."
  },
  {
    id: "sensory-processing-disorder",
    title: "Sensory Processing Disorder (SPD)",
    category: "Diagnosis",
    categoryColor: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    date: "Aug 05, 2025",
    image: "https://therapedia.center/uploads/Knowledge//72aca797-d006-4775-9b91-5227ba5a18b7.jpg",
    excerpt:
      "As parents, we often notice when something seems 'off' with how our child reacts to certain sounds, textures, movements, or routines. Some children cover their ears or refuse to wear specific clothing...",
    content:
      "Sensory Processing Disorder occurs when the brain has difficulty receiving and responding to information that comes in through the eight senses: visual, auditory, tactile, olfactory, gustatory, vestibular (balance), proprioceptive (body position), and interoceptive (internal body sensations). A child might be hypersensitive (over-responsive) leading to meltdowns in crowded spaces, or hyposensitive (under-responsive) resulting in constant movement, crashing into furniture, or low awareness of pain. Occupational therapy utilizes Sensory Integration (SI) to help modulate sensory signals, building regulation and comfort in daily environments."
  },
  {
    id: "understanding-sensory-integration",
    title: "Understanding Sensory Integration: A Guide for Parents",
    category: "Sensory Integration",
    categoryColor: "bg-blue-500/10 text-blue-600 border-blue-200",
    date: "Aug 04, 2025",
    image: "https://therapedia.center/uploads/Knowledge//d0b0dd14-f675-4522-9305-6f6d2c7201a8.jpeg",
    excerpt:
      "As parents, we often hear terms like sensory processing or sensory integration, especially if our child is facing developmental challenges. But what does it actually mean, and how does it help?",
    content:
      "Sensory Integration was pioneered by Dr. A. Jean Ayres, an occupational therapist and neuroscientist. It refers to the neurological process that organizes sensation from one's own body and from the environment, making it possible to use the body effectively within the environment. At Therapedia, certified therapists provide just-right challenges using specialized suspended equipment (hammocks, bolsters, Lycra swings) that stimulate the inner ear and joints. This strengthens the child's brain-body connection, leading to better focus, coordination, and emotional resilience."
  },
  {
    id: "what-is-occupational-therapy",
    title: "What is Pediatric Occupational Therapy?",
    category: "Occupational Therapy",
    categoryColor: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    date: "Aug 03, 2025",
    image: "https://therapedia.center/uploads/Knowledge//2df4c8c5-0ad3-4b2b-853d-8d50206cb94b.jpg",
    excerpt:
      "Occupational therapy is a healthcare profession that helps individuals of all ages participate in meaningful daily activities. For a child, their main 'occupation' is playing, learning, and self-care...",
    content:
      "While adults work in jobs, a child's occupations are playing, social interaction, learning at school, eating, dressing, and sleeping. When developmental delays, autism, sensory issues, or motor coordination challenges interfere with these everyday occupations, pediatric occupational therapists evaluate the child's strengths and difficulties. Treatment is play-based and empowering, building fine motor grip for pencil holding, motor planning for navigating playground equipment, and independence in everyday self-care."
  }
];
