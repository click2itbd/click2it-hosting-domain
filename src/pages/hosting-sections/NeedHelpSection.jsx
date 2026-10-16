import React from 'react';
import { Phone, MessageCircle, Ticket } from 'lucide-react';

export default function NeedHelpSection({
  phoneNumber = '+880 XXXX-XXXXXX',
  onOpenChat,
  onOpenTicket,
}) {
  const handleChat = () => {
    if (typeof onOpenChat === 'function') {
      onOpenChat();
    }
  };

  const handleTicket = () => {
    if (typeof onOpenTicket === 'function') {
      onOpenTicket();
    }
  };

  return (
    <section className="border-y border-[var(--c2i-line)] bg-white">
      <div className="container mx-auto px-2 sm:px-4 py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--c2i-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              Need Help? We're Here For You
            </h2>
            <p className="mt-1 text-sm text-[var(--c2i-ink-soft)]">
              Our team replies within minutes — pick the channel that works best for you.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a
              href={`tel:${phoneNumber}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--c2i-line)] px-5 py-2.5 text-sm font-bold text-[var(--c2i-ink)] hover:border-[var(--c2i-red)] hover:text-[var(--c2i-red)] transition-colors"
            >
              <Phone size={16} />
              Call Us
            </a>

            <button
              type="button"
              onClick={handleChat}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--c2i-line)] px-5 py-2.5 text-sm font-bold text-[var(--c2i-ink)] hover:border-[var(--c2i-red)] hover:text-[var(--c2i-red)] transition-colors"
            >
              <MessageCircle size={16} />
              Live Chat
            </button>

            <button
              type="button"
              onClick={handleTicket}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--c2i-line)] px-5 py-2.5 text-sm font-bold text-[var(--c2i-ink)] hover:border-[var(--c2i-red)] hover:text-[var(--c2i-red)] transition-colors"
            >
              <Ticket size={16} />
              Open Ticket
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
