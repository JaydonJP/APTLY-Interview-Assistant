import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader } from "../Card";

describe("Card Component", () => {
  it("renders children correctly", () => {
    render(
      <Card id="test-card">
        <p>Card Content</p>
      </Card>
    );
    expect(screen.getByText("Card Content")).toBeDefined();
    expect(document.getElementById("test-card")).toBeDefined();
  });

  it("renders CardHeader with title and description", () => {
    render(
      <CardHeader
        title="Test Title"
        description="Test Description"
      />
    );
    expect(screen.getByText("Test Title")).toBeDefined();
    expect(screen.getByText("Test Description")).toBeDefined();
  });
});
