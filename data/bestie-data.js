function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function sortByCustomerName(customers) {
  return [...customers].sort((a, b) =>
    String(a.customer_name || "").localeCompare(
      String(b.customer_name || ""),
      "id",
      {
        sensitivity: "base",
      },
    ),
  );
}

async function loadCustomers() {
  var sources = [
    "./data/bestie_dummy_customers_20.json",
    "./bestie_dummy_customers_20.json",
  ];

  for (var i = 0; i < sources.length; i += 1) {
    try {
      var response = await fetch(sources[i], { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      var parsed = await response.json();
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sortByCustomerName(parsed);
      }
    } catch (error) {
      // Fallback will handle file:// and other fetch limitations.
    }
  }

  if (
    Array.isArray(window.BESTIE_CUSTOMERS) &&
    window.BESTIE_CUSTOMERS.length > 0
  ) {
    return sortByCustomerName(window.BESTIE_CUSTOMERS);
  }

  return [];
}

function computeMetrics(customers) {
  var total = customers.length;
  var totalIndustri = customers.filter(function (item) {
    return normalizeText(item.customer_type) === "industri";
  }).length;
  var totalBisnis = customers.filter(function (item) {
    return normalizeText(item.customer_type) === "bisnis";
  }).length;

  return {
    total: total,
    totalIndustri: totalIndustri,
    totalBisnis: totalBisnis,
  };
}

function filterCustomers(customers, options) {
  var search = normalizeText(options.search || "");
  var ulp = normalizeText(options.ulp || "all");
  var customerType = normalizeText(options.customerType || "all");

  return customers.filter(function (item) {
    var matchSearch =
      search === "" ||
      normalizeText(item.customer_id).includes(search) ||
      normalizeText(item.customer_name).includes(search);

    var matchUlp = ulp === "all" || normalizeText(item.ulp) === ulp;
    var matchType =
      customerType === "all" ||
      normalizeText(item.customer_type) === customerType;

    return matchSearch && matchUlp && matchType;
  });
}

function paginateCustomers(customers, currentPage, pageSize) {
  var safePageSize = pageSize > 0 ? pageSize : 10;
  var totalItems = customers.length;
  var totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  var safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  var start = (safeCurrentPage - 1) * safePageSize;
  var end = start + safePageSize;

  return {
    items: customers.slice(start, end),
    totalItems: totalItems,
    totalPages: totalPages,
    currentPage: safeCurrentPage,
    startIndex: totalItems === 0 ? 0 : start + 1,
    endIndex: Math.min(end, totalItems),
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function createCustomerRow(customer, index, isAdmin) {
  var tarif = customer.tariff_label || customer.power_label || "-";
  var detailHref =
    "profile-pelanggan.html?id=" +
    encodeURIComponent(customer.customer_id || "");
  var deleteButton = isAdmin
    ? '<button data-admin-only class="w-8 h-8 rounded-lg border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors" data-delete-row><span class="material-symbols-outlined text-[18px]">delete</span></button>'
    : "";

  return [
    '<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">',
    '  <td class="px-6 py-5 text-gray-400">' + index + "</td>",
    '  <td class="px-6 py-5 font-bold text-slate-800 text-left">' +
      (customer.customer_name || "Pelanggan Dummy") +
      "</td>",
    '  <td class="px-6 py-5 text-gray-500">' +
      (customer.customer_id || "-") +
      "</td>",
    '  <td class="px-6 py-5 text-gray-500">' +
      (customer.customer_type || "-") +
      "</td>",
    '  <td class="px-6 py-5 text-gray-500">' + (customer.ulp || "-") + "</td>",
    '  <td class="px-6 py-5 text-right flex items-center justify-end gap-5">',
    '    <span class="font-bold bg-gray-100 text-slate-600 px-3 py-1 rounded-full text-[11px]">' +
      tarif +
      "</span>",
    "    " + deleteButton,
    '    <a href="' +
      detailHref +
      '" class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition-colors"><span class="material-symbols-outlined text-[18px]">arrow_forward</span></a>',
    "  </td>",
    "</tr>",
  ].join("\n");
}

function renderTable(config) {
  var rows = config.rows;
  var tableBody = config.tableBody;
  var isAdmin = config.isAdmin;
  var paged = config.paged;
  var summaryQuery = config.summaryQuery;
  var summaryCount = config.summaryCount;
  var paginationInfo = config.paginationInfo;
  var emptyStateText = config.emptyStateText;

  if (paged.items.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="px-6 py-10 text-center text-sm text-gray-500">' +
      (emptyStateText || "Data tidak ditemukan") +
      "</td></tr>";
  } else {
    tableBody.innerHTML = paged.items
      .map(function (customer, idx) {
        return createCustomerRow(customer, paged.startIndex + idx, isAdmin);
      })
      .join("\n");
  }

  if (summaryQuery) {
    summaryQuery.textContent = rows.search || "Semua Pelanggan";
  }
  if (summaryCount) {
    summaryCount.textContent = String(paged.totalItems);
  }
  if (paginationInfo) {
    paginationInfo.textContent =
      "Menampilkan " +
      paged.startIndex +
      "-" +
      paged.endIndex +
      " dari " +
      paged.totalItems +
      " pelanggan";
  }

  tableBody.querySelectorAll("[data-delete-row]").forEach(function (button) {
    button.addEventListener("click", function () {
      var row = button.closest("tr");
      if (row) {
        row.remove();
      }
    });
  });
}

function renderProfile(customer, elements) {
  var data = customer || {};

  if (elements.title) {
    elements.title.textContent = data.customer_name || "Pelanggan Dummy";
  }
  if (elements.subtitle) {
    elements.subtitle.textContent =
      (data.customer_type || "Pelanggan") +
      " • " +
      (data.city || "Kota Dummy") +
      " • ID " +
      (data.customer_id || "-");
  }
  if (elements.contactPerson) {
    elements.contactPerson.textContent = data.contact_person || "PIC Dummy";
  }
  if (elements.email) {
    elements.email.textContent = data.email || "dummy@bestie.id";
  }
  if (elements.ulp) {
    elements.ulp.textContent = data.ulp || "ULP Dummy";
  }
  if (elements.tariff) {
    elements.tariff.textContent = data.tariff_label || "Tarif Dummy";
  }
  if (elements.power) {
    elements.power.textContent = data.power_label || "0 VA";
  }
  if (elements.industryGroup) {
    elements.industryGroup.textContent =
      data.industry_group || "Industri Dummy";
  }
  if (elements.status) {
    elements.status.textContent = data.status || "active";
  }
  if (elements.notes) {
    elements.notes.textContent = data.notes || "Catatan dummy.";
  }
}

window.BESTIE_DATA = {
  loadCustomers: loadCustomers,
  computeMetrics: computeMetrics,
  filterCustomers: filterCustomers,
  paginateCustomers: paginateCustomers,
  renderTable: renderTable,
  renderProfile: renderProfile,
  formatNumber: formatNumber,
};
