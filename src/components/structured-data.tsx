export function WebsiteStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PracticeNudge",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      description: "Free during pilot programme",
    },
    description:
      "MTD client readiness tracking and document collection tool for UK accountants. Track which clients are Making Tax Digital ready, send reminders, and collect documents.",
    url: "https://www.practicenudge.com",
    author: {
      "@type": "Organization",
      name: "PracticeNudge",
      url: "https://www.practicenudge.com",
    },
    aggregateRating: undefined,
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PracticeNudge",
    url: "https://www.practicenudge.com",
    description:
      "MTD client readiness tracking tool built for small UK accounting practices.",
    foundingDate: "2025",
    areaServed: {
      "@type": "Country",
      name: "United Kingdom",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is PracticeNudge tax filing software?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. PracticeNudge does not file taxes or submit anything to HMRC. It is a tracking and chasing tool that sits alongside your existing accounting software like Xero, QuickBooks, or FreeAgent.",
        },
      },
      {
        "@type": "Question",
        name: "How is PracticeNudge different from a spreadsheet for MTD tracking?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Spreadsheets go stale quickly. PracticeNudge provides live status tracking, automated reminders, magic upload links for clients, and a clear dashboard view without manual updates.",
        },
      },
      {
        "@type": "Question",
        name: "What size accounting practice is PracticeNudge for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PracticeNudge is built for sole practitioners and small practices with 20-200 clients. If you are too small for enterprise tools but too busy for spreadsheets, this is for you.",
        },
      },
      {
        "@type": "Question",
        name: "Is PracticeNudge free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, PracticeNudge is free during the pilot programme. After launch, pricing starts from £29/month, with pilot members receiving 50% off permanently.",
        },
      },
      {
        "@type": "Question",
        name: "When does MTD for Income Tax start?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "MTD for Income Tax (ITSA) started 6 April 2026 for sole traders and landlords with qualifying income over £50,000. The threshold drops to £30,000 from April 2027 and £20,000 from April 2028.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
