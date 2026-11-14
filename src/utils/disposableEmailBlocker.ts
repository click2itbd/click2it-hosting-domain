/**
 * Disposable & Temporary Email Blocker for Click2IT
 * Detects and blocks disposable / burner / 10-minute temporary email providers
 * to prevent automated spamming, fraud orders, and IP reputation damage.
 */

const DISPOSABLE_DOMAINS: Set<string> = new Set([
  // Popular burner / 10-minute email providers
  'mailinator.com',
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.org',
  'sharklasers.com',
  'grr.la',
  'spam4.me',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'throwawaymail.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'dispostable.com',
  'fakeinbox.com',
  'mohmal.com',
  'mohmal.im',
  'mohmal.in',
  'crazymailing.com',
  'dropmail.me',
  'tempail.com',
  'mytemp.email',
  'inboxkitten.com',
  'burnermail.io',
  'nada.ltd',
  'getnada.com',
  'aboymail.com',
  'givmail.com',
  'clrmail.com',
  'tafmail.com',
  'emailondeck.com',
  'mailcatch.com',
  'generator.email',
  'tempinbox.com',
  'tmpmail.org',
  'tmpmail.net',
  'disposablemail.com',
  'fakemailgenerator.com',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'einrot.com',
  'spambog.com',
  'tempr.email',
  'discard.email',
  '0815.ru',
  'drdrb.net',
  'trashcanmail.com',
  'spamgourmet.com',
  'mytempemail.com',
  'maildrop.cc',
  'mailnesia.com',
  'mailnull.com',
  'zillamail.com',
  'inboxbear.com',
  'harakirimail.com',
  'tmail.ws',
  'trash-mail.at',
  'chacuo.net',
  'bccto.me',
  'brefmail.com',
  'binkmail.com',
  'bobmail.info',
  'chammy.info',
  'devnullmail.com',
  'emailigo.de',
  'filzmail.com',
  'getairmail.com',
  'haltospam.com',
  'instant-mail.de',
  'jetable.org',
  'kasmail.com',
  'lortemail.dk',
  'mailimate.com',
  'meltmail.com',
  'noclickemail.com',
  'onewaymail.com',
  'pookmail.com',
  'quickinbox.com',
  'rcpt.at',
  'safersignup.com',
  'spamavert.com',
  'spambox.us',
  'tempemail.co',
  'trashymail.com',
  'uggsrock.com',
  'veryrealemail.com',
  'whyspam.me',
  'yep.it',
  'zoemail.com',
  'burner.email',
  'minutemail.com',
  'throwaway.email',
  'trashmail.org',
  'mytempmail.com',
  'temporarymail.com',
]);

const DISPOSABLE_HEURISTICS: RegExp[] = [
  /\b10minute/i,
  /\bdisposab/i,
  /\bthrowaway/i,
  /\btrashmail/i,
  /\bguerrillamail/i,
  /\bfakemail/i,
  /\bburnermail/i,
  /\btmpmail/i,
  /\btemp-?mail/i,
  /\byopmail/i,
  /\bmailinator/i,
];

export interface EmailCheckResult {
  isValid: boolean;
  isDisposable: boolean;
  domain: string;
  errorMessage?: string;
}

/**
 * Validates an email address and checks if it belongs to a known temporary/disposable provider.
 */
export function checkEmailSafety(rawEmail?: string | null): EmailCheckResult {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return {
      isValid: false,
      isDisposable: false,
      domain: '',
      errorMessage: 'ইমেইল ঠিকানা প্রদান করুন (Email address is required).',
    };
  }

  const clean = rawEmail.trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');

  if (atIndex === -1 || atIndex === 0 || atIndex === clean.length - 1) {
    return {
      isValid: false,
      isDisposable: false,
      domain: '',
      errorMessage: 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন (Please enter a valid email address).',
    };
  }

  const domain = clean.slice(atIndex + 1).trim();

  // 1. Direct domain match
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      isDisposable: true,
      domain,
      errorMessage: `নিরাপত্তার স্বার্থে ডিসপোজেবল বা অস্থায়ী ইমেইল (${domain}) গ্রহণযোগ্য নয়। অনুগ্রহ করে একটি স্থায়ী ও বৈধ ইমেইল (Gmail, Yahoo, Outlook ইত্যাদি) ব্যবহার করুন।`,
    };
  }

  // 2. Subdomain check (e.g., test.mailinator.com)
  for (const known of DISPOSABLE_DOMAINS) {
    if (domain.endsWith(`.${known}`)) {
      return {
        isValid: false,
        isDisposable: true,
        domain,
        errorMessage: `অস্থায়ী বা ডিসপোজেবল ইমেইল সেবা (${domain}) ব্যবহার করা যাবে না। অনুগ্রহ করে একটি স্থায়ী ব্যক্তিগত বা অফিসিয়াল ইমেইল ব্যবহার করুন।`,
      };
    }
  }

  // 3. Heuristic pattern match
  for (const regex of DISPOSABLE_HEURISTICS) {
    if (regex.test(domain)) {
      return {
        isValid: false,
        isDisposable: true,
        domain,
        errorMessage: `অস্থায়ী বা স্বয়ংক্রিয়ভাবে মুছে যাওয়া ইমেইল ঠিকানা গ্রহণযোগ্য নয়। অনুগ্রহ করে একটি স্থায়ী ও ভেরিফাইড ইমেইল ঠিকানা দিন।`,
      };
    }
  }

  return {
    isValid: true,
    isDisposable: false,
    domain,
  };
}
