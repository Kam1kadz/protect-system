export default function PrivacyPage() {
    return (
        <article className="prose prose-invert max-w-3xl">
            <h1>Privacy Policy</h1>
            <p className="text-[--muted] text-sm">Last updated: January 1, 2025</p>

            <h2>1. Data We Collect</h2>
            <p>
                We collect the following information when you register: username, email address,
                IP address, and hardware identifier (HWID) for license binding purposes.
            </p>

            <h2>2. How We Use Your Data</h2>
            <p>
                Your data is used solely to provide and secure the service. We do not sell or
                share your personal data with third parties.
            </p>

            <h2>3. Data Retention</h2>
            <p>
                Account data is retained for the duration of your account. You may request
                deletion by contacting support.
            </p>

            <h2>4. Security</h2>
            <p>
                We use industry-standard encryption (AES-256-GCM) to protect sensitive data.
                Passwords are hashed using bcrypt and are never stored in plain text.
            </p>

            <h2>5. Contact</h2>
            <p>
                For data-related requests, contact us via the Discord server or Telegram listed
                on the homepage.
            </p>
        </article>
    )
}