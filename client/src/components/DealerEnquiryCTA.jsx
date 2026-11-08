import { Phone, Mail } from 'lucide-react';
import Button from './Button.jsx';
import { Reveal } from './Reveal.jsx';

export default function DealerEnquiryCTA({
  heading = 'Need Help With a Dealer or Business Enquiry?',
  description = 'Send your requirement through the form, or reach us directly by phone or email.',
}) {
  return (
    <Reveal className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
      <div>
        <h2 className="text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">{heading}</h2>
        {description && <p className="mt-2.5 max-w-[480px] text-[17.5px] text-text-invert-muted">{description}</p>}
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
        <Button to="/contact?type=dealer" variant="onColor">Enquiry</Button>
        <a href="tel:+919735496000" className="inline-flex items-center gap-1.5 text-[17.5px] font-medium text-text-invert-muted hover:text-white">
          <Phone size={15} /> +91 97354 96000
        </a>
        <a href="mailto:hpclcfa2000@gmail.com" className="inline-flex items-center gap-1.5 text-[17.5px] font-medium text-text-invert-muted hover:text-white">
          <Mail size={15} /> hpclcfa2000@gmail.com
        </a>
      </div>
    </Reveal>
  );
}
