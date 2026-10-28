"use strict";

(() => {
  const CHECKLIST_KEY = "nagoriksathi_passport_checklist_v1";
  const CACHE_VERSION = "nagoriksathi-static-v1";

  const pages = [...document.querySelectorAll(".page")];
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const toast = document.getElementById("toast");

  let toastTimer;
  let lastFocusedElement = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function navigate(pageName, updateHistory = true) {
    const page = document.getElementById("page-" + pageName);

    if (!page) {
      if (pageName === "sources") {
        openSourcesModal();
      }
      return;
    }

    pages.forEach(item => item.classList.toggle("active", item === page));

    navLinks.forEach(link => {
      const active = link.dataset.page === pageName;
      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (updateHistory) {
      const url = new URL(window.location.href);
      url.hash = pageName;
      window.history.pushState({ page: pageName }, "", url);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pageFromHash() {
    const name = window.location.hash.replace("#", "");
    return document.getElementById("page-" + name) ? name : "home";
  }

  document.addEventListener("click", event => {
    const pageButton = event.target.closest("[data-page]");

    if (pageButton) {
      event.preventDefault();
      navigate(pageButton.dataset.page);
      return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (actionButton?.dataset.action === "open-guide-details") {
      const details = document.getElementById("guide-details");
      const isOpening = details.hidden;

      details.hidden = !isOpening;
      actionButton.textContent = isOpening
        ? "নির্দেশনা বন্ধ করুন ↑"
        : "নির্দেশনা দেখুন ↓";

      if (isOpening) {
        details.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });

  window.addEventListener("popstate", () => {
    navigate(pageFromHash(), false);
  });

  // Guide search
  const searchInput = document.getElementById("guide-search");
  const serviceCard = document.querySelector(".service-card");
  const guideEmpty = document.getElementById("guide-empty");
  const guideDetails = document.getElementById("guide-details");

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLocaleLowerCase("bn");
    const text = (serviceCard.textContent + " " + guideDetails.textContent)
      .toLocaleLowerCase("bn");

    const matches = !query || text.includes(query);

    serviceCard.hidden = !matches;
    guideEmpty.hidden = matches;

    if (!matches) {
      guideDetails.hidden = true;
    }
  });

  // Checklist: save only the completion state.
  const checklistInputs = [
    ...document.querySelectorAll("[data-check]")
  ];

  function loadChecklist() {
    try {
      const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "{}");

      checklistInputs.forEach(input => {
        input.checked = saved[input.dataset.check] === true;
      });
    } catch (error) {
      showToast("সংরক্ষিত চেকলিস্ট পড়া যায়নি। নতুন করে টিক দিতে পারেন।");
    }

    updateProgress();
  }

  function saveChecklist() {
    const saved = {};

    checklistInputs.forEach(input => {
      saved[input.dataset.check] = input.checked;
    });

    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(saved));
    } catch (error) {
      showToast("এই ব্রাউজারে অগ্রগতি সংরক্ষণ করা যায়নি।");
    }

    updateProgress();
  }

  function updateProgress() {
    const total = checklistInputs.length;
    const completed = checklistInputs.filter(input => input.checked).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    document.getElementById("progress-label").textContent =
      `${completed} / ${total}`;

    document.getElementById("progress-bar").style.width = percent + "%";
    document.getElementById("progress-bar").setAttribute(
      "aria-valuenow", String(percent)
    );
    document.getElementById("progress-bar").setAttribute("role", "progressbar");
    document.getElementById("progress-bar").setAttribute(
      "aria-valuemin", "0"
    );
    document.getElementById("progress-bar").setAttribute(
      "aria-valuemax", "100"
    );

    const messages = [
      "শুরু করার জন্য একটি কাজ সম্পন্ন করুন।",
      "ভালো শুরু! বাকি প্রস্তুতি যাচাই করুন।",
      "এগিয়ে যাচ্ছেন। সরকারি নির্দেশনার সঙ্গে মিলিয়ে নিন।",
      "আরও কয়েকটি ধাপ বাকি।",
      "প্রস্তুতি প্রায় সম্পূর্ণ।",
      "চেকলিস্টের সব কাজ টিক দেওয়া হয়েছে। সরকারি নির্দেশনা শেষবার যাচাই করুন।"
    ];

    const messageIndex = completed === total
      ? 5
      : Math.min(4, Math.floor((completed / Math.max(total, 1)) * 5));

    document.getElementById("progress-message").textContent =
      messages[messageIndex];
  }

  checklistInputs.forEach(input => {
    input.addEventListener("change", saveChecklist);
  });

  document.getElementById("reset-checklist").addEventListener("click", () => {
    const confirmed = window.confirm(
      "চেকলিস্টের সব টিক মুছে ফেলতে চান?"
    );

    if (!confirmed) return;

    checklistInputs.forEach(input => {
      input.checked = false;
    });

    try {
      localStorage.removeItem(CHECKLIST_KEY);
    } catch (error) {
      // The current screen is still reset even if storage is unavailable.
    }

    updateProgress();
    showToast("চেকলিস্ট রিসেট করা হয়েছে।");
  });

  // Problem assistance: guidance only, never submits a complaint.
  const problemGuides = {
    delay: {
      title: "আবেদনে বিলম্ব হলে কী করবেন",
      intro: "বিলম্বের কারণ সব ক্ষেত্রে এক নয়। প্রথমে আবেদন ও এনরোলমেন্টের বর্তমান অবস্থা যাচাই করুন।",
      steps: [
        "সরকারি পোর্টালে আপনার আবেদনের অবস্থা বা প্রাসঙ্গিক নোটিশ দেখুন।",
        "আবেদনের রেফারেন্স ও রসিদ নিজের কাছে নিরাপদে রাখুন।",
        "নির্ধারিত সময় পার হলে সংশ্লিষ্ট পাসপোর্ট অফিসের সরকারি যোগাযোগের মাধ্যম যাচাই করুন।",
        "সেবা-সংক্রান্ত অভিযোগের প্রয়োজন হলে GRS-এর নিয়ম ও যোগ্যতা পড়ুন।"
      ],
      source: "https://www.epassport.gov.bd/"
    },
    fee: {
      title: "ফি নিয়ে বিভ্রান্তি হলে কী করবেন",
      intro: "অনুমান করে বা অনানুষ্ঠানিক দাবির ভিত্তিতে টাকা দেবেন না। আপনার আবেদন-শ্রেণির সরকারি ফি ও পেমেন্ট পদ্ধতি মিলিয়ে নিন।",
      steps: [
        "পাসপোর্টের পৃষ্ঠা, মেয়াদ ও ডেলিভারি শ্রেণি অনুযায়ী সরকারি ফি তালিকা দেখুন।",
        "সরকারি পোর্টালে উল্লেখিত অনুমোদিত পেমেন্ট মাধ্যম ব্যবহার করুন।",
        "পেমেন্টের রসিদ নিরাপদে রাখুন।",
        "অমিল বা সেবা-সংক্রান্ত সমস্যা থাকলে প্রাসঙ্গিক সরকারি যোগাযোগের মাধ্যম খুঁজুন।"
      ],
      source: "https://www.epassport.gov.bd/instructions/passport-fees"
    },
    documents: {
      title: "কাগজপত্র নিয়ে সমস্যা হলে কী করবেন",
      intro: "প্রয়োজনীয় নথি আবেদনকারীর বয়স, পরিচয় এবং আবেদনের ধরনের ওপর নির্ভর করতে পারে।",
      steps: [
        "সরকারি নির্দেশনার বর্তমান সংস্করণ পড়ুন।",
        "আপনার NID বা প্রযোজ্য জন্মনিবন্ধন-সংক্রান্ত শর্ত মিলিয়ে নিন।",
        "এনরোলমেন্টে কোন মূল নথি লাগবে তা সরকারি নির্দেশনা ও নোটিশে নিশ্চিত করুন।",
        "বিশেষ পরিস্থিতি হলে সংশ্লিষ্ট পাসপোর্ট অফিসের সরকারি নির্দেশনা নিন।"
      ],
      source: "https://www.epassport.gov.bd/instructions/instructions"
    },
    conduct: {
      title: "সেবা পেতে অসুবিধা হলে কী করবেন",
      intro: "ঘটনা ও প্রমাণের ভিত্তিতে পরবর্তী পদক্ষেপ ঠিক করুন। যাচাই না করে কাউকে প্রকাশ্যে অভিযুক্ত করবেন না।",
      steps: [
        "ঘটনার তারিখ, সেবার ধরন এবং কী সমস্যা হয়েছে তা ব্যক্তিগতভাবে লিখে রাখুন।",
        "প্রাসঙ্গিক রসিদ বা নথি নিরাপদে সংরক্ষণ করুন।",
        "প্রথমে সংশ্লিষ্ট দপ্তরের প্রযোজ্য সরকারি যোগাযোগের মাধ্যম যাচাই করুন।",
        "প্রযোজ্য হলে GRS-এ অভিযোগ করার নিয়ম ও সীমাবদ্ধতা পড়ুন।"
      ],
      source: "https://www.grs.gov.bd/"
    },
    other: {
      title: "সঠিক পরবর্তী পদক্ষেপ খুঁজুন",
      intro: "প্রথমে সমস্যাটি কোন সেবার সঙ্গে সম্পর্কিত এবং কোন সরকারি কর্তৃপক্ষ দায়িত্বে আছে তা চিহ্নিত করুন।",
      steps: [
        "সংশ্লিষ্ট সরকারি সেবার অফিসিয়াল ওয়েবসাইট খুঁজুন।",
        "সর্বশেষ নির্দেশনা, FAQ এবং যোগাযোগের তথ্য পড়ুন।",
        "নিজের সমস্যার প্রাসঙ্গিক তথ্য নিরাপদে গুছিয়ে রাখুন।",
        "সেবা-সংক্রান্ত অভিযোগের উপযুক্ত পথ বুঝতে GRS নির্দেশনা পড়ুন।"
      ],
      source: "https://www.epassport.gov.bd/"
    }
  };

  const resultPanel = document.getElementById("problem-result");

  document.querySelectorAll("[data-problem]").forEach(button => {
    button.addEventListener("click", () => {
      const guide = problemGuides[button.dataset.problem];
      if (!guide) return;

      document.querySelectorAll("[data-problem]").forEach(item => {
        item.classList.toggle("selected", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });

      document.getElementById("problem-result-title").textContent =
        guide.title;

      document.getElementById("problem-result-intro").textContent =
        guide.intro;

      const steps = document.getElementById("problem-result-steps");
      steps.replaceChildren();

      guide.steps.forEach(text => {
        const li = document.createElement("li");
        li.textContent = text;
        steps.appendChild(li);
      });

      document.getElementById("problem-source-link").href = guide.source;
      resultPanel.hidden = false;
      resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.getElementById("show-grs").addEventListener("click", () => {
    window.open("https://www.grs.gov.bd/", "_blank", "noopener,noreferrer");
  });

  // Privacy and sources dialog
  const sourcesModal = document.getElementById("sources-modal");

  function openSourcesModal() {
    lastFocusedElement = document.activeElement;
    sourcesModal.hidden = false;
    document.getElementById("close-sources").focus();
    document.body.style.overflow = "hidden";
  }

  function closeSourcesModal() {
    sourcesModal.hidden = true;
    document.body.style.overflow = "";

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  document.getElementById("close-sources").addEventListener(
    "click", closeSourcesModal
  );

  document.getElementById("close-sources-bottom").addEventListener(
    "click", closeSourcesModal
  );

  sourcesModal.addEventListener("click", event => {
    if (event.target === sourcesModal) closeSourcesModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !sourcesModal.hidden) {
      closeSourcesModal();
    }
  });

  // Footer year
  document.getElementById("current-year").textContent =
    String(new Date().getFullYear());

  // Initial state
  loadChecklist();
  navigate(pageFromHash(), false);

  // Offline support is optional; the website still works without it.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .catch(() => {
          // Core website features remain available online.
        });
    });
  }
})();
