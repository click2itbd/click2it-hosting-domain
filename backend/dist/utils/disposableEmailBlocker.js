/**
 * Disposable & Temporary Email Blocker for Click2IT Backend
 * Validates and rejects disposable / burner / 10-minute temporary email providers
 * to protect IP reputation, prevent spam abuse, and stop fraudulent orders.
 */
const DISPOSABLE_DOMAINS = new Set([
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
const DISPOSABLE_HEURISTICS = [
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
export function checkEmailSafety(rawEmail) {
    if (!rawEmail || typeof rawEmail !== 'string') {
        return {
            isValid: false,
            isDisposable: false,
            domain: '',
            errorMessage: 'Email address is required.',
        };
    }
    const clean = rawEmail.trim().toLowerCase();
    const atIndex = clean.lastIndexOf('@');
    if (atIndex === -1 || atIndex === 0 || atIndex === clean.length - 1) {
        return {
            isValid: false,
            isDisposable: false,
            domain: '',
            errorMessage: 'Please provide a valid email address.',
        };
    }
    const domain = clean.slice(atIndex + 1).trim();
    // 1. Direct domain match
    if (DISPOSABLE_DOMAINS.has(domain)) {
        return {
            isValid: false,
            isDisposable: true,
            domain,
            errorMessage: `Disposable or temporary email address (${domain}) is not allowed for security reasons. Please use a permanent email address (such as Gmail, Yahoo, Outlook, or custom domain).`,
        };
    }
    // 2. Subdomain check
    for (const known of DISPOSABLE_DOMAINS) {
        if (domain.endsWith(`.${known}`)) {
            return {
                isValid: false,
                isDisposable: true,
                domain,
                errorMessage: `Disposable or temporary email address (${domain}) is not allowed for security reasons. Please use a permanent email address.`,
            };
        }
    }
    // 3. Heuristic pattern check
    for (const regex of DISPOSABLE_HEURISTICS) {
        if (regex.test(domain)) {
            return {
                isValid: false,
                isDisposable: true,
                domain,
                errorMessage: `Temporary burner email addresses are not permitted. Please use a permanent, verified email address.`,
            };
        }
    }
    return {
        isValid: true,
        isDisposable: false,
        domain,
    };
}
