export type ProgressStatus = 'Completed' | 'Accepted' | 'Sent';

export interface Course {
  id: string;
  name: string;
  org: string;
  courseImageAssetPath?: string;
  startDate?: string;
  endDate?: string;
  status: ProgressStatus;
  percent: number;
  progressStatus?: string;
}

export interface StatusConfig {
  icon: React.ComponentType;
  color: string;
  altText: string;
}
