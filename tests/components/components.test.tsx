import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GameList } from "../../src/components/GameList/GameList";
import { Score } from "../../src/components/Score/Score";
import { Button } from "../../src/components/Button/Button";
import { LoadingState } from "../../src/components/LoadingState/LoadingState";
import { ErrorState } from "../../src/components/ErrorState/ErrorState";
import { EmptyState } from "../../src/components/EmptyState/EmptyState";

const lookups = {
  teamsById: new Map([
    ["team_01", { teamId: "team_01", class: "U18", name: "Team Alpha", groupId: "g1" }],
    ["team_02", { teamId: "team_02", class: "U18", name: "Team Beta", groupId: "g1" }],
    ["team_03", { teamId: "team_03", class: "U18", name: "Zeta Warriors", groupId: "g1" }],
  ]),
  fieldsById: new Map([
    ["field_01", { fieldId: "field_01", name: "Main Field" }],
  ]),
};

describe("component states (doc §8, §14.2)", () => {
  it("renders loading state", () => {
    render(<LoadingState label="Loading games…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading games…");
  });

  it("renders empty state with hint", () => {
    render(<EmptyState title="No games" hint="Try another round" />);
    expect(screen.getByText("No games")).toBeInTheDocument();
    expect(screen.getByText("Try another round")).toBeInTheDocument();
  });

  it("renders retryable error state and distinguishes not-found", () => {
    const { rerender } = render(
      <ErrorState message="boom" onRetry={() => {}} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    rerender(<ErrorState notFound message="Game not found" />);
    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("game list shows teams, score, referee and field", () => {
    const { container } = render(
      <MemoryRouter>
        <GameList
          games={[
            {
              gameId: "game_01",
              roundId: "round_01",
              fieldId: "field_01",
              teamAId: "team_01",
              teamBId: "team_02",
              refereeTeamId: "team_03",
              scoreA: 2,
              scoreB: 1,
            },
          ]}
          lookups={lookups}
        />
      </MemoryRouter>,
    );
    // §30 hierarchy: team rows with per-team scores, header badges,
    // referee footer.
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
    expect(screen.getByText("Referee: Zeta Warriors")).toBeInTheDocument();
    expect(screen.getByText("Main Field")).toBeInTheDocument();
    expect(container.querySelector(".game-card")).toBeInTheDocument();
    expect(container.querySelector(".game-card__header")).toBeInTheDocument();
    expect(
      container.querySelectorAll(".game-card__team"),
    ).toHaveLength(2);
    expect(container.querySelector(".game-card__footer")).toBeInTheDocument();
  });

  it("score display is high-contrast with accessible name", () => {
    render(<Score scoreA={3} scoreB={1} />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Score 3 to 1");
  });

  it("button variants render disabled + loading states", () => {
    const { rerender } = render(
      <Button variant="primary">Retry</Button>,
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();

    rerender(
      <Button variant="danger" disabled>
        Delete
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();

    rerender(
      <Button variant="secondary" loading>
        Save
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Loading…");
  });
});
