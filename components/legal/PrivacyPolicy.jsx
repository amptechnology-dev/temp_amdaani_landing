export default function PrivacyPolicy() {
  return (
    <div className="px-5 md:px-7 py-6 max-w-3xl">
      <div className="mb-2">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
          Terms & Conditions
        </h1>
        <p className="text-[13.5px] text-slate-500 mt-1">
          Please read carefully before using our services
        </p>
      </div>

      <p className="text-[12.5px] italic text-slate-400 mt-4 mb-4">Last Updated: June 6, 2026</p>
      <div className="h-px bg-slate-200 mb-6" />

      <div className="space-y-7 text-[13.5px] leading-relaxed text-slate-600">
        <Section title="1. Introduction and Acceptance of Terms">
          <p>
            Welcome to the billing, invoicing, inventory, and business management application{" "}
            <b className="text-slate-800">AMDAANI</b>, developed and operated by{" "}
            <b className="text-slate-800">AMP Technology</b>.
          </p>
          <p className="mt-2">
            These Terms & Conditions govern the access and use of the App, website, services,
            software, reports, tools, and all related features provided by the Company. By
            accessing, registering, downloading, installing, or using the App in any manner, you
            agree to comply with and be legally bound by these Terms & Conditions.{" "}
            <b className="text-slate-800">
              If you do not agree with any part of these Terms, you must immediately discontinue
              use of the App and all related services.
            </b>
          </p>
          <p className="mt-2">
            The App is intended to assist businesses, shop owners, traders, distributors,
            wholesalers, retailers, service providers, and organizations in managing invoices,
            billing operations, stock records, purchase entries, sales entries, customer
            information, supplier details, tax calculations, and reporting processes digitally
            and efficiently.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p>
            The App may collect, store, process, and manage various categories of information
            necessary for providing billing, invoicing, inventory management, reporting, customer
            management, and related business services. Such information may include business
            details, Business Type, company name, GST numbers, tax-related information, billing
            addresses, contact information (Phone No, E-mail Address), customer and supplier
            records, invoice data, purchase and sales history, payment records, transaction
            details, stock and inventory information, uploaded files, generated reports, and
            other business-related data entered by the user during the use of the App.
          </p>
          <p className="mt-2">
            In addition, the App may automatically collect certain technical and device-related
            information including IP address, browser type, operating system, Location, device
            identifiers, login activity, application version, crash reports, access timestamps,
            network information, session logs, and usage analytics for operational, security,
            troubleshooting, and service improvement purposes.
          </p>
        </Section>

        <Section title="Use of Information">
          <p>
            The information collected through the App may be used for operating, maintaining,
            managing, improving, and providing the services offered through the platform. Such
            use may include account creation and management, invoice and report generation,
            billing operations, inventory management, customer support, subscription management,
            payment processing, communication regarding updates or service-related notices,
            security verification, fraud detection, troubleshooting, analytics, system
            monitoring, backup management, and technical support.
          </p>
        </Section>

        <Section title="Data Sharing">
          <p>
            The Company might Share, sell, rent, or commercially trade personal or business data
            of users to unrelated third parties for marketing purposes. However, the Company may
            share, disclose, transfer, or provide access to certain information where reasonably
            necessary for operation, maintenance, security, legal compliance, or delivery of
            services associated with the App.
          </p>
          <p className="mt-2">
            Such sharing may include cloud hosting providers, payment gateway operators, SMS or
            email service providers, analytics providers, technical infrastructure partners,
            customer support systems, data storage vendors, integration partners, security
            service providers, consultants, auditors, or other third-party vendors engaged for
            legitimate operational purposes.
          </p>
        </Section>

        <Section title="2. Nature of the Service">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Software Platform Only:</b> The App is a
                software-based technology platform developed strictly to assist users in managing
                business operations digitally. The Company only provides software tools and
                related technical services.
              </>,
              <>
                <b className="text-slate-800">No Professional Advice:</b> The Company does not
                act as a chartered accountant, auditor, tax consultant, legal advisor, GST
                practitioner, financial advisor, or government-authorized compliance agency.
              </>,
              <>
                <b className="text-slate-800">System-Generated Outputs:</b> The reports, invoices,
                GST calculations, stock summaries, accounting figures, analytics, and financial
                records generated through the App are system-generated outputs based entirely on
                the data entered, modified, imported, or deleted by the user. The Company does
                not independently verify, validate, audit, or guarantee the correctness,
                legality, completeness, or accuracy of such data or reports.
              </>,
              <>
                <b className="text-slate-800">No Compliance Guarantee:</b> Use of the App does not
                guarantee compliance with GST laws, tax laws, accounting standards, audit
                requirements, or any government regulations applicable to the user's business or
                jurisdiction.
              </>,
            ]}
          />
        </Section>

        <Section title="3. User Responsibility">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Sole Accountability:</b> The user shall remain
                fully and solely responsible for all activities conducted through the App,
                including but not limited to invoice creation, bill generation, GST entries,
                stock adjustments, purchase management, sales management, customer records,
                supplier records, payment records, accounting entries, report generation, and
                tax-related calculations.
              </>,
              <>
                <b className="text-slate-800">Mandatory Data Verification:</b> The user is solely
                responsible for verifying all data before issuing invoices, filing taxes, sharing
                reports, printing documents, or using generated records for official, legal,
                accounting, taxation, banking, or audit purposes.
              </>,
              <>
                <b className="text-slate-800">Prohibited Conduct:</b> The user agrees not to use
                the App for any illegal, fraudulent, misleading, harmful, unauthorized, or
                prohibited activity, including but not limited to fake invoicing, tax evasion,
                money laundering, unauthorized data collection, cyber abuse, financial fraud, or
                misuse of customer information.
              </>,
            ]}
          />
        </Section>

        <Section title="Device Information">
          <p>
            In order to provide secure, reliable, and efficient access to the App and related
            services, the Company may automatically collect certain technical and device-related
            information including IP address, registered mobile number, device identifiers,
            operating system details, browser type, device configuration, network information,
            approximate geo-location data, Messages, application version, login activity, and
            other technical identifiers generated during use of the App.
          </p>
        </Section>

        <Section title="Location and Device Access Information">
          <p>
            Where necessary for service functionality, security verification, fraud prevention,
            regulatory compliance, or location-based features, the Company may collect, access,
            process, or use certain device and location-related information. By using the App,
            the user expressly consents to the collection and processing of such location and
            device-related information to the extent permitted under applicable laws and device
            permissions granted by the user.
          </p>
        </Section>

        <Section title="4. GST, Taxation, and Compliance Disclaimer">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Convenience Features Only:</b> The App may provide
                GST-related calculations, tax summaries, HSN/SAC support, invoice formats, and
                tax reports for user convenience. However, the Company does not guarantee that
                such calculations or formats comply with the latest government notifications or
                legal amendments.
              </>,
              <>
                <b className="text-slate-800">Independent Verification Required:</b> Users are
                advised to independently verify all GST rates, tax calculations, invoice
                structures, and accounting records with qualified professionals before official
                use or government submission.
              </>,
              <>
                <b className="text-slate-800">Exclusion of Tax Liability:</b> The Company shall
                not be liable for any GST disputes, tax penalties, late fees, interest, legal
                notices, departmental actions, audit objections, filing errors, or financial
                losses arising from the use of the App.
              </>,
            ]}
          />
        </Section>

        <Section title="5. Data Accuracy and Generated Reports">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Dependency on User Input:</b> All invoices, reports,
                stock statements, ledgers, summaries, analytics, and other outputs generated by
                the App are dependent upon user-provided information. The Company does not
                guarantee the completeness, reliability, legality, accuracy, or suitability of
                any generated data or report.
              </>,
              <>
                <b className="text-slate-800">Software Limitations:</b> Users acknowledge that
                software systems may occasionally contain bugs, technical limitations, rounding
                differences, synchronization issues, or calculation discrepancies. All generated
                reports and invoices must be independently verified before business or legal use.
              </>,
              <>
                <b className="text-slate-800">No Liability for Business Disruptions:</b> The
                Company shall not be responsible for business losses, accounting mismatches,
                stock differences, incorrect reports, duplicate records, accidental deletions, or
                financial damages caused by system usage or user actions.
              </>,
            ]}
          />
        </Section>

        <Section title="6. Data Storage, Security, and Backup">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Security Efforts:</b> The Company implements
                commercially reasonable technical and organizational security measures to protect
                user information. However, no software platform or electronic storage system can
                guarantee absolute security or complete protection against cyber threats.
              </>,
              <>
                <b className="text-slate-800">Risk of Data Loss:</b> Users understand and agree
                that data may be affected by technical errors, server failures, internet
                interruptions, unauthorized access, hacking attempts, malware attacks, hardware
                failures, or events beyond reasonable control.
              </>,
              <>
                <b className="text-slate-800">Mandatory Independent Backups:</b> The user remains
                solely responsible for maintaining independent backups of all critical business
                records, invoices, customer data, tax records, and reports. The Company shall not
                be liable for permanent or temporary data loss or restoration failures.
              </>,
            ]}
          />
        </Section>

        <Section title="7. Third-Party Services and Integrations">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Dependence on Third Parties:</b> The App may
                integrate with third-party services such as payment gateways, cloud hosting
                providers, SMS services, WhatsApp services, email services, or analytics tools.
                Such third-party services operate independently under their own terms and privacy
                policies.
              </>,
              <>
                <b className="text-slate-800">No Control Over Third Parties:</b> The Company does
                not control and shall not be responsible for third-party downtime, interruptions,
                service failures, data breaches, or security incidents arising from third-party
                systems or integrations.
              </>,
            ]}
          />
        </Section>

        <Section title="8. Subscription, Payments, and Refund Policy">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Advance Payments:</b> Certain features of the App
                may require payment of subscription fees, renewal charges, or service charges. By
                purchasing any paid plan, the user agrees to pay all applicable charges in
                advance.
              </>,
              <>
                <b className="text-slate-800">Strict No-Refund Policy:</b> Unless otherwise
                required under applicable law, all payments made to the Company shall be
                non-refundable, non-transferable, and non-cancellable. Failure to pay subscription
                fees may result in restricted access, suspension, or permanent termination of
                services.
              </>,
              <>
                <b className="text-slate-800">Pricing Revisions:</b> The Company reserves the
                right to revise pricing, subscription structures, renewal policies, and feature
                availability at any time without prior individual notice.
              </>,
            ]}
          />
        </Section>

        <Section title="Payment Information and Card Security">
          <p>
            The Company does not collect, store, retain, process, or maintain sensitive
            card-related authentication data such as CVV numbers, card PINs, full debit or credit
            card details, ATM credentials, or banking passwords on its servers. Payment
            transactions, where applicable, may be processed through authorized third-party
            payment gateway providers operating under their own security standards and privacy
            policies.
          </p>
        </Section>

        <Section title="9. Intellectual Property Rights">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Exclusive Ownership:</b> All software, source code,
                system architecture, databases, user interface designs, layouts, graphics, logos,
                trademarks, trade names, reports, workflows, features, and related intellectual
                property associated with the App are the exclusive property of the Company and
                its licensors.
              </>,
              <>
                <b className="text-slate-800">Prohibited Actions:</b> Users are strictly
                prohibited from copying, modifying, distributing, reverse engineering, extracting
                source code, reselling, sublicensing, reproducing, publishing, or commercially
                exploiting any portion of the App without prior written permission.
              </>,
              <>
                <b className="text-slate-800">Legal Enforcement:</b> Unauthorized use of the App
                or its intellectual property may result in civil liability, criminal prosecution,
                legal proceedings, and permanent termination of access.
              </>,
            ]}
          />
        </Section>

        <Section title="10. Suspension and Termination of Services">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Right to Terminate:</b> The Company reserves the
                absolute right to suspend, restrict, disable, or terminate user access to the
                App, temporarily or permanently, without prior notice, if the Company reasonably
                believes that the user has violated these Terms, engaged in suspicious
                activities, caused security risks, or misused the platform in any manner.
              </>,
              <>
                <b className="text-slate-800">Surviving Liabilities:</b> Termination or
                suspension of access shall not affect any existing liabilities, payment
                obligations, legal rights, or claims arising before such termination.
              </>,
            ]}
          />
        </Section>

        <Section title='11. "As Is" and "As Available" Disclaimer'>
          <Bullets
            items={[
              <>
                <b className="text-slate-800">No Assurances:</b> The App and all related services
                are provided on an "As Is" and "As Available" basis without any warranties,
                guarantees, representations, or assurances of any kind, whether express, implied,
                statutory, or otherwise.
              </>,
              <>
                <b className="text-slate-800">Assumption of Risk:</b> By using the App, the user
                agrees that use of the software is entirely at the user's own risk and
                discretion. The Company expressly disclaims all warranties including implied
                warranties of merchantability, fitness for a particular purpose,
                non-infringement, availability, reliability, and security.
              </>,
            ]}
          />
        </Section>

        <Section title="12. Limitation of Liability">
          <Bullets
            items={[
              <>
                <b className="text-slate-800">Maximum Exclusion:</b> To the maximum extent
                permitted under applicable law, the Company, its owners, directors, employees,
                developers, affiliates, consultants, licensors, service providers, agents, and
                partners shall not be liable for any direct, indirect, incidental, consequential,
                special, exemplary, punitive, or financial damages arising from or related to the
                use of the App.
              </>,
              <>
                <b className="text-slate-800">Scope of Excluded Losses:</b> This limitation
                includes but is not limited to losses relating to business interruption, tax
                penalties, audit disputes, accounting errors, loss of profits, loss of goodwill,
                data breaches, system downtime, invoice disputes, incorrect calculations, software
                bugs, unauthorized access, third-party failures, or financial losses.
              </>,
            ]}
          />
        </Section>

        <Section title="13. Indemnification">
          <p>
            The user agrees to fully indemnify, defend, and hold harmless the Company, its
            owners, employees, developers, affiliates, and representatives from and against any
            claims, liabilities, damages, penalties, actions, proceedings, losses, expenses, or
            legal costs (including reasonable attorney fees) arising from the user's actions,
            misuse of the App, violation of laws, incorrect records, customer disputes, GST
            disputes, tax disputes, fraudulent activities, or breach of these Terms & Conditions.
          </p>
        </Section>

        <Section title="Force Majeure Clause">
          <p>
            The Company shall not be liable for any delay, interruption, failure, or inability to
            perform obligations due to causes beyond reasonable control including natural
            disasters, floods, fire, cyber attacks, power failures, internet outages, government
            actions, war, labor disputes, pandemics, or failures of third-party infrastructure or
            services.
          </p>
        </Section>

        <Section title="14. Changes to Terms and Services">
          <p>
            The Company reserves the right to modify, update, discontinue, suspend, or change any
            part of the App, features, pricing, policies, or these Terms & Conditions at any time
            without prior notice. Continued use of the App after such changes shall constitute
            explicit acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="15. Governing Law and Jurisdiction">
          <p>
            These Terms & Conditions shall be governed by and interpreted in accordance with the
            laws of <b className="text-slate-800">India</b>. Any disputes arising out of or
            relating to the App, services, or these Terms shall be subject to the exclusive
            jurisdiction of the courts located in{" "}
            <b className="text-slate-800">Kolkata, West Bengal, India</b>.
          </p>
        </Section>

        <Section title="16. Contact Information">
          <p>For support, privacy concerns, or official communication, users may contact:</p>
          <div className="mt-3 rounded-xl bg-slate-50 border-l-4 border-blue-600 p-4 space-y-1.5">
            <p className="font-medium text-slate-700">🏢 Company Name: AMP Technology</p>
            <p className="font-medium text-slate-700">📧 Email: Sales@amdaani.com</p>
            <p className="font-medium text-slate-700">📧 Support: Support@amdaani.com</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-bold text-[15px] text-slate-900 mb-2.5 tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="mt-2 ml-1 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-slate-400 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}