import React from 'react';
import ProgressIndicator from './ProgressIndicator';
import { CourseCardWithEnrollment } from '../CourseCard';
import { Course } from './types';

interface CourseWithProgressProps {
  course: Course;
  learningPathId: string;
  enrollmentDateInLearningPath?: string | null;
  onCourseClick: () => void;
}

const CourseWithProgress: React.FC<CourseWithProgressProps> = ({
  course,
  learningPathId,
  enrollmentDateInLearningPath,
  onCourseClick,
}) => (
  <div className="course-with-progress">
    <div className="course-card-wrapper">
      <CourseCardWithEnrollment
        course={course}
        learningPathId={learningPathId}
        isEnrolledInLearningPath={enrollmentDateInLearningPath != null}
        onClick={onCourseClick}
        orientationOverride="vertical"
      />
    </div>
  </div>
);

export default CourseWithProgress;
