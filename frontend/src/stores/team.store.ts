import { create } from 'zustand';
import { Team } from '@/types';
import { teamService } from '@/services/team.service';

interface TeamState {
  teams: Team[];
  teamTree: Team[];
  isLoading: boolean;
  selectedTeam: Team | null;

  fetchTeams: (params?: { current?: number; size?: number; teamName?: string; status?: number }) => Promise<void>;
  fetchTeamTree: () => Promise<void>;
  setSelectedTeam: (team: Team | null) => void;
  reset: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  teamTree: [],
  isLoading: false,
  selectedTeam: null,

  fetchTeams: async (params) => {
    set({ isLoading: true });
    try {
      const response = await teamService.getTeams(params);
      set({ teams: (response as any).records ?? [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchTeamTree: async () => {
    set({ isLoading: true });
    try {
      const tree = await teamService.getTeamTree(true);
      set({ teamTree: tree, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setSelectedTeam: (team) => set({ selectedTeam: team }),

  reset: () => {
    set({ teams: [], teamTree: [], selectedTeam: null });
  },
}));
