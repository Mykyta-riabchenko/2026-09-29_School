import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../../src/components/Button/Button";
import { Badge, StatusBadge } from "../../src/components/Badge/Badge";
import { StatusBanner } from "../../src/components/StatusBanner/StatusBanner";
import { Icon } from "../../src/components/Icon/Icon";
import { Score } from "../../src/components/Score/Score";
import { TeamList } from "../../src/components/TeamList/TeamList";

// Design-system contract (style doc §§9, 12, 16, 29, 38):
// visual roles map to reusable BEM classes, never hard-coded values.
describe("design system", () => {
  it("buttons use BEM variant + size classes", () => {
    const { rerender } = render(<Button variant="primary">Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toHaveClass("button");
    expect(btn).toHaveClass("button--primary");

    rerender(
      <Button variant="ghost" size="sm">
        Back
      </Button>,
    );
    const ghost = screen.getByRole("button", { name: "Back" });
    expect(ghost).toHaveClass("button--ghost");
    expect(ghost).toHaveClass("button--sm");
  });

  it("loading buttons expose the BEM loader", () => {
    const { container } = render(<Button loading>Save</Button>);
    expect(container.querySelector(".button__loader")).toBeInTheDocument();
  });

  it("badges expose all documented variants", () => {
    const { container } = render(
      <>
        <Badge variant="neutral">A</Badge>
        <Badge variant="live">B</Badge>
        <Badge variant="success">C</Badge>
        <Badge variant="warning">D</Badge>
        <Badge variant="brand">E</Badge>
      </>,
    );
    for (const variant of ["neutral", "live", "success", "warning", "brand"]) {
      expect(
        container.querySelector(`.badge--${variant}`),
      ).toBeInTheDocument();
    }
  });

  it("status badges map to semantic colours, never ad hoc", () => {
    const { rerender } = render(<StatusBadge status="live">Live</StatusBadge>);
    expect(screen.getByText("Live")).toHaveClass("badge--live");

    rerender(<StatusBadge status="completed">Done</StatusBadge>);
    expect(screen.getByText("Done")).toHaveClass("badge--success");

    rerender(<StatusBadge status="warning">Stale</StatusBadge>);
    expect(screen.getByText("Stale")).toHaveClass("badge--warning");
  });

  it("status banner shows progress with an accessible progressbar", () => {
    render(
      <StatusBanner
        title="Tournament control panel"
        subtitle="18 games"
        progressLabel="3 of 6 rounds scheduled"
        progressValue={0.5}
      />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(
      document.querySelector(".status-banner__progress-value"),
    ).toBeInTheDocument();
  });

  it("icons come from one inline-SVG system and inherit colour", () => {
    const { container } = render(<Icon name="teams" size="sm" />);
    const svg = container.querySelector("svg.icon--sm");
    expect(svg).toBeInTheDocument();
    expect(svg?.tagName.toLowerCase()).toBe("svg");
  });

  it("scores mark winner/loser with tabular numerals", () => {
    const { container } = render(<Score scoreA={3} scoreB={1} />);
    expect(container.querySelector(".score--winner")).toHaveTextContent("3");
    expect(container.querySelector(".score--loser")).toHaveTextContent("1");
  });

  it("team cards use BEM structure with metadata badges", () => {
    const { container } = render(
      <TeamList
        teams={[
          { teamId: "t1", class: "U18", name: "Alpha", groupId: "g1" },
        ]}
        groupsById={new Map([["g1", { groupId: "g1", name: "Group A" }]])}
      />,
    );
    expect(container.querySelector(".team-card")).toBeInTheDocument();
    expect(container.querySelector(".team-card__name")).toHaveTextContent(
      "Alpha",
    );
    // Opaque group IDs resolve to names via lookup.
    expect(screen.getByText("Group A")).toBeInTheDocument();
    expect(screen.queryByText("g1")).toBeNull();
  });
});
