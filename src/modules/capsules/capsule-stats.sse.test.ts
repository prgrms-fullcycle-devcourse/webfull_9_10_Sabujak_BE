jest.mock("./capsules.service", () => ({
  capsulesService: {
    createSlugReservation: jest.fn(),
    createCapsule: jest.fn(),
    getCapsule: jest.fn(),
    getCapsuleStats: jest.fn(),
    getMessageCount: jest.fn(),
    verifyCapsulePassword: jest.fn(),
    updateCapsule: jest.fn(),
    deleteCapsule: jest.fn(),
    createMessage: jest.fn(),
  },
}));

jest.mock("./capsule-stats.publisher", () => ({
  capsuleStatsPublisher: {
    clear: jest.fn(),
    subscribe: jest.fn(),
  },
}));

import { capsuleStatsPublisher } from "./capsule-stats.publisher";
import { capsulesService } from "./capsules.service";
import { streamCapsuleStats } from "./capsules.controller";

const mockedCapsulesService = jest.mocked(capsulesService);
const mockedPublisher = jest.mocked(capsuleStatsPublisher);

describe("streamCapsuleStats", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("publisher에 response와 snapshot getter를 전달한다", async () => {
    const response = { locals: {} } as never;
    mockedCapsulesService.getCapsuleStats.mockResolvedValue({
      totalCapsuleCount: 12,
      totalMessageCount: 77,
    });

    let capturedInput!: Parameters<typeof mockedPublisher.subscribe>[0];
    mockedPublisher.subscribe.mockImplementation(async (input) => {
      capturedInput = input;
      await input.getSnapshot();
      return () => undefined;
    });

    await streamCapsuleStats({} as never, response);

    expect(mockedPublisher.subscribe).toHaveBeenCalledTimes(1);
    expect(capturedInput.response).toBe(response);
    expect(mockedCapsulesService.getCapsuleStats).toHaveBeenCalledTimes(1);
  });
});
