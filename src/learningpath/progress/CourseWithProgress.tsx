import React from 'react';
import { CourseCardWithEnrollment } from '../CourseCard';
import { Course } from './types';

interface CourseWithProgressProps {
  course: Course;
  learningPathId: string;
  isEnrolledInLearningPath?: boolean | false;
  onCourseClick: () => void;
}

const CourseWithProgress: React.FC<CourseWithProgressProps> = ({
  course,
  learningPathId,
  isEnrolledInLearningPath,
  onCourseClick,
}) => (
  <div className="course-with-progress">
    <div className="course-card-wrapper">
      <CourseCardWithEnrollment
        course={course}
        learningPathId={learningPathId}
        isEnrolledInLearningPath={isEnrolledInLearningPath}
        onClick={onCourseClick}
        orientationOverride="vertical"
      />
    </div>
  </div>
);

export default CourseWithProgress;
