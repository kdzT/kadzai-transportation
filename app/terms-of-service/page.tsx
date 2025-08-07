"use client";

import {
  BookOpen,
  ClipboardList,
  Luggage,
  CalendarOff,
  CreditCard,
  User,
  Info,
  ToolCase,
} from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Terms & Conditions
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Please read our terms carefully before using our services. Your
            booking is an acknowledgment of these terms.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white p-8 sm:p-12 rounded-lg shadow-lg">
          <div className="prose prose-lg max-w-none">
            {/* Section 1 */}
            <div>
              <h2 className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6 text-primary" />
                <span>Purpose & Scope</span>
              </h2>
              <p>
                These terms and conditions govern the relationship between
                Kadzai Transport Ltd (&quot;KTL&quot;) and its clients
                concerning all transport services rendered. Unless a separate
                agreement is in place, these terms apply to all bookings and
                usage of our services. By making a reservation, the client
                acknowledges and accepts these terms. Service availability,
                pricing, and estimated departure/arrival times are subject to
                change due to road conditions, operational constraints, and
                force majeure factors.
              </p>
            </div>

            {/* Section 2 */}
            <div className="mt-12">
              <h2 className="flex items-center space-x-3">
                <ClipboardList className="w-6 h-6 text-primary" />
                <span>Bookings, Payments & Reservation</span>
              </h2>
              <p>
                Bookings for shared or private transport services may be made in
                person at our designated offices or online via our website. If a
                confirmed booking is unavailable due to unforeseen issues, KTL
                will reschedule affected clients at no additional cost. All
                ticket sales are final. No refunds apply unless KTL is at fault.
                Ticket transfers are not permitted without prior approval from
                KTL management.
              </p>
            </div>

            {/* Section 3 */}
            <div className="mt-12">
              <h2 className="flex items-center space-x-3">
                <User className="w-6 h-6 text-primary" />
                <span>Check-in & Boarding</span>
              </h2>
              <p>
                Passengers are required to arrive at the designated departure
                location at least 30 minutes before the scheduled departure
                time. Late arrivals may forfeit their seats. Boarding is allowed
                only at approved locations specified by KTL.
              </p>
            </div>

            {/* Section 4 */}
            <div className="mt-12">
              <h2 className="flex items-center space-x-3">
                <Luggage className="w-6 h-6 text-primary" />
                <span>Luggage Policy</span>
              </h2>
              <p>
                Passengers using shared services may carry luggage not exceeding
                20kg (max dimensions: 30&quot; x 22&quot; x 15&quot;). KTL is
                primarily a passenger transport company and not a logistics
                provider.
              </p>
              <h3 className="font-semibold">Excess Luggage</h3>
              <p>
                Passengers with excess luggage must notify KTL at booking.
                Charges may apply for extra seats or separate transportation.
              </p>
              <h3 className="font-semibold">Packing Standards</h3>
              <p>
                KTL is not responsible for damage resulting from poor or
                improper packaging. Clients must carry fragile items personally
                and avoid placing breakables in the luggage hold.
              </p>
              <h3 className="font-semibold">Banned & Regulated Items</h3>
              <p>
                Transporting illegal, banned, or hazardous items (e.g., gas
                cylinders, explosives, chemicals) is strictly prohibited. KTL
                will report any violations to the relevant authorities.
              </p>
              <h3 className="font-semibold">Luggage Identification</h3>
              <p>
                Each piece of luggage must be properly labeled with the
                owner&apos;s name and contact information. KTL is not liable for
                unmarked or misidentified property. Unclaimed items will be held
                for 30 days before disposal.
              </p>
            </div>

            {/* ... other sections similarly wrapped ... */}

            <div className="mt-12">
              <h2 className="flex items-center space-x-3">
                <CalendarOff className="w-6 h-6 text-primary" />
                <span>Rescheduling & Missed Trips</span>
              </h2>
              <p>
                Clients may reschedule trips no later than 24 hours before
                departure at no cost, with a maximum of two reschedules per
                ticket. Rescheduling beyond this limit or due to lateness will
                incur penalties:
              </p>
              <ul className="list-disc pl-6">
                <li>NGN 6,000 for Prestige</li>
                <li>NGN 5,000 for Regular</li>
              </ul>
              <p>
                Rescheduling is subject to availability and current pricing.
                Tickets expire 30 days after the initial booking date.
              </p>
            </div>

            <div className="mt-12">
              <h2 className="flex items-center space-x-3">
                <CreditCard className="w-6 h-6 text-primary" />
                <span>Online Transaction Disputes</span>
              </h2>
              <p>
                For transaction issues (e.g., double debit), clients must
                contact their bank and provide statements to support refund
                claims. Alternatively, contact KTL support via email.
              </p>
            </div>

            <div className="mt-12">
              <h2 className="flex items-center space-x-3">
                <User className="w-6 h-6 text-primary" />
                <span>Travel by Minors</span>
              </h2>
              <p>
                Children under 12 must be accompanied. Those aged 12–17 may
                travel unaccompanied with a signed parental consent form.
              </p>
            </div>

            <div className="mt-12">
              <h2 className="flex items-center space-x-3">
                <ToolCase className="w-6 h-6 text-primary" />
                <span>On-Transit Challenges</span>
              </h2>
              <p>
                In the event of a breakdown, KTL will arrange alternative
                transport as quickly as possible. No refunds or compensation
                will be provided for delays.
              </p>
            </div>

            <div className="mt-12">
              <h2 className="flex items-center space-x-3">
                <Info className="w-6 h-6 text-primary" />
                <span>General Terms</span>
              </h2>
              <p>
                All luggage is transported at the owner&apos;s risk. KTL
                reserves the right to amend these terms without prior notice.
                These terms represent the full agreement between Kadzai
                Transport Ltd and the client.
              </p>
            </div>

            <div className="border-t pt-6 mt-12">
              <p className="font-semibold">For inquiries:</p>
              <p>Email: kdztransportation@gmail.com</p>
              <p>Phone: +234 903 369 6516</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
