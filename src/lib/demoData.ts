import { LeadInput } from './types';

export const DEMO_LEAD: LeadInput = {
  name: 'Sarah Chen',
  company: 'Meridian Health Partners',
  role: 'Head of Operations',
  email: 'sarah.chen@meridianhealth.example.com',
  website: 'https://meridianhealth.example.com',
  linkedin: 'https://linkedin.com/in/sarahchen-ops',
  source: 'Referral from James at CloudBridge',
  context:
    'Meridian Health Partners is a mid-sized allied health group with 12 clinics across Melbourne. They are growing quickly and struggling to keep their patient intake and referral workflows efficient. Sarah mentioned at a networking event that their admin team spends roughly 15 hours per week on manual data entry between systems.',
  painPoints:
    'Manual data entry across disconnected systems. Referral tracking is done in spreadsheets. Onboarding new clinic locations takes 3-4 weeks of admin setup. Reporting to management is slow and error-prone.',
  timeline: 'Looking to start a pilot within the next 6-8 weeks',
  budget: 'Approx. $30,000-50,000 for initial engagement',
  offerSummary:
    'Workflow automation consulting: audit current processes, design streamlined workflows, implement automation using their existing tools (primarily Microsoft 365 and their clinic management system), and train the admin team.',
  notes:
    'Sarah seemed particularly interested in reducing the onboarding time for new clinics. She has buy-in from the CEO but wants to see a clear plan before committing. Very data-driven — will want to see projected time savings.',
};

export const DEMO_LEAD_PEAKVIEW: LeadInput = {
  name: 'Jane Hamlett',
  company: 'Peakview Care Services Ltd',
  role: 'Operations Manager',
  email: 'jane.hamlett@peakviewcare.co.uk',
  website: 'https://www.peakviewcare.co.uk',
  linkedin: 'https://www.linkedin.com/in/jane-hamlett-ops',
  source: 'Referral',
  context:
    'Connected via mutual operations contact in the healthcare sector. Jane oversees linen procurement and inventory management across multiple care sites. The current process relies on an Excel-based calculator and manual email communication with an external laundry provider. The process is time-intensive and prone to human error.',
  painPoints:
    'Manual Excel-based linen calculator requiring multiple data inputs. No centralised inventory tracking or audit trail. Orders manually copied into email and sent to external laundry team. No automated stock level calculation or validation checks. No visibility over who created or approved orders. Estimated 5 hours per week spent managing this process. Risk of miscalculation, over-ordering, or missed orders.',
  timeline: 'Next 4-6 weeks',
  budget: '\u00a320,000-\u00a335,000',
  offerSummary:
    'Design and build a lightweight desktop or web-based application with: Centralised database for linen inventory tracking. Automated stock level calculation and reorder logic. Order generation with stored digital copy. One-click email dispatch to external laundry provider. Role-based user access and activity log (audit trail). Built-in validation checks and approval workflow (checks and balances). Dashboard view of inventory status and order history. No AI component required \u2014 focus on workflow automation, accuracy, and accountability.',
  notes:
    'Primary objective: save minimum 5 hours per week. Secondary objective: reduce operational risk and improve transparency. Multi-site scalability may be required in future phase. Integration with existing accounting or procurement systems may be explored later.',
};
