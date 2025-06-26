import { MedicalCode } from '../types/medical-codes';

export const sampleCodes: MedicalCode[] = [
  {
    diagnosis_code: 'E66.9',
    disease_description: 'Obesity, unspecified',
    considered_but_excluded: 'False',
    reason_for_exclusion: '',
    supporting_info: [
      {
        supporting_sentence_in_document: 'Obesity',
        document_name: 'H&P 5.pdf',
        section_name: 'Medical Problems',
        page_number: '2',
        bounding_box: {
          x: 120,
          y: 180,
          width: 80,
          height: 20
        }
      },
      {
        supporting_sentence_in_document: '18. Obesity, BMI 37 kg/m2',
        document_name: 'H&P 5.pdf',
        section_name: 'Progress Notes by Daniels, Lisa, MD',
        page_number: '12',
        bounding_box: {
          x: 100,
          y: 220,
          width: 200,
          height: 20
        }
      },
      {
        supporting_sentence_in_document: 'Appearance: She is obese.',
        document_name: 'H&P 5.pdf',
        section_name: 'Physical Exam (Warren, ACNP, cosigned Zivot, MD)',
        page_number: '7',
        bounding_box: {
          x: 150,
          y: 160,
          width: 180,
          height: 20
        }
      }
    ],
    reason_for_coding: 'Physician (Dr. Daniels) documents obesity with BMI. Physical exam also notes obesity. This is a chronic condition relevant to overall health.',
    active_disease_asof_1june2025: 'True',
    supporting_sentence_for_active_disease: '18. Obesity, BMI 37 kg/m2 (H&P 5, pg 12).',
    active_management_asof_1june2025: 'False',
    supporting_sentence_for_active_management: 'No specific active management for obesity itself is detailed beyond noting BMI and its impact on ECMO candidacy.',
    comments: [
      {
        id: 'comment-1',
        text: 'BMI of 37 indicates Class II obesity. This is significant for home health planning and may impact mobility and other care considerations.',
        timestamp: '2025-01-27T10:30:00Z',
        author: 'Dr. Sarah Johnson',
        added_by: 'Dr. Sarah Johnson'
      },
      {
        id: 'comment-2',
        text: 'Consider nutritional counseling and weight management strategies as part of the care plan.',
        timestamp: '2025-01-27T14:15:00Z',
        author: 'Nurse Practitioner Lisa Chen',
        added_by: 'Medical Coder Jane Smith'
      }
    ]
  },
  {
    diagnosis_code: 'N84.0',
    disease_description: 'Polyp of corpus uteri',
    considered_but_excluded: 'False',
    reason_for_exclusion: '',
    supporting_info: [
      {
        supporting_sentence_in_document: 'Uterine polyp',
        document_name: 'H&P 5.pdf',
        section_name: 'Medical Problems',
        page_number: '1',
        bounding_box: {
          x: 120,
          y: 220,
          width: 120,
          height: 20
        }
      }
    ],
    reason_for_coding: "Listed in the problem list with a recent notation date (3/29/2025), suggesting it's an active or recently identified issue.",
    active_disease_asof_1june2025: 'True',
    supporting_sentence_for_active_disease: 'Uterine polyp (H&P 5, pg 1).',
    active_management_asof_1june2025: 'False',
    supporting_sentence_for_active_management: 'No specific active management detailed for home health in these documents. May require GYN follow-up.',
    comments: [
      {
        id: 'comment-3',
        text: 'Patient should be scheduled for gynecological follow-up to determine if intervention is needed.',
        timestamp: '2025-01-27T09:45:00Z',
        author: 'Care Coordinator Maria Rodriguez',
        added_by: 'Care Coordinator Maria Rodriguez'
      }
    ]
  },
  {
    diagnosis_code: 'I47.20',
    disease_description: 'Ventricular tachycardia, unspecified',
    considered_but_excluded: 'False',
    reason_for_exclusion: '',
    supporting_info: [
      {
        supporting_sentence_in_document: 'MCOT (11/13/24) ...1% burden of PVCs with 3 runs of NSVT longest episode lasting 8 heart beats (rate 122 bpm)',
        document_name: 'H&P 4.pdf',
        section_name: 'IMAGING REVIEWED (PA Lampert)',
        page_number: '8',
        bounding_box: {
          x: 80,
          y: 200,
          width: 400,
          height: 40
        }
      }
    ],
    reason_for_coding: 'Nonsustained ventricular tachycardia (NSVT) documented on MCOT. I47.20 is used as the type (e.g. monomorphic/polymorphic) is not specified for coding.',
    active_disease_asof_1june2025: 'True',
    supporting_sentence_for_active_disease: 'MCOT (11/13/24) ...3 runs of NSVT (H&P 4, pg 8).',
    active_management_asof_1june2025: 'True',
    supporting_sentence_for_active_management: 'Monitored via MCOT. Part of overall cardiac assessment and management plan.',
    comments: [
      {
        id: 'comment-4',
        text: 'NSVT episodes require close cardiac monitoring. Ensure patient has access to emergency services and knows when to seek immediate care.',
        timestamp: '2025-01-27T11:20:00Z',
        author: 'Cardiologist Dr. Michael Thompson',
        added_by: 'Cardiologist Dr. Michael Thompson'
      },
      {
        id: 'comment-5',
        text: 'Patient education on symptoms to watch for is crucial - palpitations, dizziness, chest pain, or syncope.',
        timestamp: '2025-01-27T13:30:00Z',
        author: 'Cardiac Nurse Specialist Jennifer Lee',
        added_by: 'Clinical Supervisor Tom Wilson'
      }
    ]
  },
  {
    diagnosis_code: 'M47.817',
    disease_description: 'Spondylosis without myelopathy or radiculopathy, lumbosacral region',
    considered_but_excluded: 'False',
    reason_for_exclusion: '',
    supporting_info: [
      {
        supporting_sentence_in_document: 'Arthritis of low back',
        document_name: 'H&P 5.pdf',
        section_name: 'Medical Problems',
        page_number: '2',
        bounding_box: {
          x: 120,
          y: 260,
          width: 160,
          height: 20
        }
      }
    ],
    reason_for_coding: "Listed as 'Arthritis of low back' in problem list, which often corresponds to spondylosis in ICD-10-CM.",
    active_disease_asof_1june2025: 'True',
    supporting_sentence_for_active_disease: 'Arthritis of low back (H&P 5, pg 2).',
    active_management_asof_1june2025: 'True',
    supporting_sentence_for_active_management: 'Home medications diclofenac gel, methocarbamol (though noted as not taking recently for methocarbamol) (H&P 5, pg 3). PRN APAP, robaxin, diclofenac (H&P 2, pg 2).',
    comments: [
      {
        id: 'comment-6',
        text: 'Patient has been prescribed multiple pain management medications. Monitor for effectiveness and side effects, especially with NSAIDs.',
        timestamp: '2025-01-27T08:15:00Z',
        author: 'Physical Therapist Robert Kim',
        added_by: 'Physical Therapist Robert Kim'
      }
    ]
  },
  {
    diagnosis_code: 'I25.10',
    disease_description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
    considered_but_excluded: 'True',
    reason_for_exclusion: 'While patient has cardiac arrhythmias and is on cardiac medications, there is no specific documentation of coronary artery disease or atherosclerosis in the available records. The cardiac issues appear to be rhythm-related rather than ischemic.',
    supporting_info: [
      {
        supporting_sentence_in_document: 'Metoprolol 25mg PO BID for cardiac rhythm control',
        document_name: 'H&P 5.pdf',
        section_name: 'Current Medications',
        page_number: '3',
        bounding_box: {
          x: 100,
          y: 300,
          width: 300,
          height: 20
        }
      },
      {
        supporting_sentence_in_document: 'Echocardiogram: Normal left ventricular function, EF 55-60%',
        document_name: 'H&P 4.pdf',
        section_name: 'IMAGING REVIEWED (PA Lampert)',
        page_number: '1',
        bounding_box: {
          x: 120,
          y: 250,
          width: 280,
          height: 20
        }
      }
    ],
    reason_for_coding: 'Initially considered due to cardiac medications and monitoring, but excluded after review showed normal cardiac function and no evidence of coronary disease.',
    active_disease_asof_1june2025: 'False',
    supporting_sentence_for_active_disease: 'No evidence of coronary artery disease in available documentation.',
    active_management_asof_1june2025: 'False',
    supporting_sentence_for_active_management: 'Cardiac medications are for rhythm control, not coronary disease management.',
    comments: [
      {
        id: 'comment-7',
        text: 'Good decision to exclude this. The echo shows normal EF and there\'s no documentation of CAD. The metoprolol is clearly for rhythm control.',
        timestamp: '2025-01-27T16:45:00Z',
        author: 'Medical Coder Jane Smith',
        added_by: 'Medical Coder Jane Smith'
      }
    ]
  },
  {
    diagnosis_code: 'E11.9',
    disease_description: 'Type 2 diabetes mellitus without complications',
    considered_but_excluded: 'True',
    reason_for_exclusion: 'Patient has obesity (BMI 37) which is a risk factor for diabetes, but no documentation of diabetes diagnosis, diabetic medications, or elevated glucose levels in the available records. Lab results show normal glucose (98 mg/dL).',
    supporting_info: [
      {
        supporting_sentence_in_document: 'Glucose: 98 mg/dL (Normal)',
        document_name: 'Lab Results.pdf',
        section_name: 'Laboratory Results',
        page_number: '1',
        bounding_box: {
          x: 150,
          y: 200,
          width: 180,
          height: 20
        }
      },
      {
        supporting_sentence_in_document: '18. Obesity, BMI 37 kg/m2',
        document_name: 'H&P 5.pdf',
        section_name: 'Progress Notes by Daniels, Lisa, MD',
        page_number: '12',
        bounding_box: {
          x: 100,
          y: 220,
          width: 200,
          height: 20
        }
      }
    ],
    reason_for_coding: 'Initially considered due to obesity as a risk factor, but excluded based on normal glucose levels and absence of diabetes documentation.',
    active_disease_asof_1june2025: 'False',
    supporting_sentence_for_active_disease: 'Normal glucose levels and no diabetes documentation in medical records.',
    active_management_asof_1june2025: 'False',
    supporting_sentence_for_active_management: 'No diabetic medications or management protocols documented.',
    comments: [
      {
        id: 'comment-8',
        text: 'Correct exclusion. Normal glucose rules out diabetes. However, with BMI 37, patient should be monitored for diabetes risk.',
        timestamp: '2025-01-27T12:00:00Z',
        author: 'Endocrinologist Dr. Patricia Williams',
        added_by: 'Endocrinologist Dr. Patricia Williams'
      },
      {
        id: 'comment-9',
        text: 'Recommend annual diabetes screening given the obesity risk factor.',
        timestamp: '2025-01-27T15:20:00Z',
        author: 'Primary Care Physician Dr. James Anderson',
        added_by: 'Quality Assurance Specialist Mary Johnson'
      }
    ]
  }
];