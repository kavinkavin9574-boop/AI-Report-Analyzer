import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SummaryCard from "../src/components/SummaryCard.jsx";
import DataTable from "../src/components/DataTable.jsx";
import Findings from "../src/components/Findings.jsx";

describe("SummaryCard", () => {
  it("renders KPI values", () => {
    render(
      <SummaryCard
        report={{ field_count: 10, normal_count: 8, outside_count: 2, ocr_confidence: 0.94 }}
      />
    );
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("94%")).toBeInTheDocument();
  });
});

describe("DataTable", () => {
  it("shows empty state when no fields", () => {
    render(<DataTable fields={[]} />);
    expect(screen.getByText(/No structured fields/i)).toBeInTheDocument();
  });

  it("renders a field row", () => {
    render(
      <DataTable
        fields={[
          {
            id: "1", parameter: "Hemoglobin", value: 11.2, unit: "g/dL",
            reference_min: 12, reference_max: 16, page_number: 1,
            confidence: 0.9, is_outside_range: 1,
          },
        ]}
      />
    );
    expect(screen.getByText("Hemoglobin")).toBeInTheDocument();
    expect(screen.getByText("Outside range")).toBeInTheDocument();
  });
});

describe("Findings", () => {
  it("shows placeholder with no analysis", () => {
    render(<Findings analysis={null} />);
    expect(screen.getByText(/No AI analysis/i)).toBeInTheDocument();
  });

  it("renders summary and findings", () => {
    render(
      <Findings
        analysis={{
          summary: "All good",
          key_findings: ["Finding 1"],
          outside_reference_ranges: [],
          missing_or_uncertain_fields: [],
          professional_review_items: [],
        }}
      />
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
    expect(screen.getByText("Finding 1")).toBeInTheDocument();
  });
});
