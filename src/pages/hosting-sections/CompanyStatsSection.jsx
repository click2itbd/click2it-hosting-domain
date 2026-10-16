import React from 'react';
import Eyebrow from '../../components/hosting-ui/Eyebrow';
import StatCounter from '../../components/hosting-ui/StatCounter';
import { Globe, Users, Ticket, Server } from 'lucide-react';

const stats = [
  { value: '10K+', label: 'Sites Hosted', Icon: Globe },
  { value: '5K+', label: 'Happy Clients', Icon: Users },
  { value: '8K+', label: 'Tickets Resolved', Icon: Ticket },
  { value: '50+', label: 'Domains Registered', Icon: Server },
];

export default function CompanyStatsSection() {
  return (
    <section className="py-16 md:py-24" style={{ background: 'var(--c2i-gradient-dark)' }}>
      <div className="container mx-auto px-2 sm:px-4">
        <div className="text-center mb-12">
          <Eyebrow light>10K+ customers trust Click2IT</Eyebrow>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {stats.map(({ value, label, Icon }, idx) => (
            <div
              key={idx}
              className="px-4 py-8 first:pl-0 last:pr-0"
            >
              <StatCounter value={value} label={label} icon={Icon} light />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
