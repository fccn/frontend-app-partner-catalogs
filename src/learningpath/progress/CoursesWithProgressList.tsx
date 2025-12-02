import React from 'react';
import { Container, Row, Col } from '@openedx/paragon';
import CourseWithProgress from './CourseWithProgress';
import { Course } from './types';

interface CoursesWithProgressListProps {
  courses?: Course[];
  learningPathId: string;
  enrollmentDateInLearningPath?: string | null;
  onCourseClick: (courseId: string) => void;
}

const CoursesWithProgressList: React.FC<CoursesWithProgressListProps> = ({
  courses = [],
  learningPathId,
  enrollmentDateInLearningPath = null,
  onCourseClick,
}) => {

  return (
    <Container fluid className="py-4 learning-path-courses-grid w-100 px-0">
    <Row className="g-12">
      {courses.map((course) => (
        <Col key={course.id} xs={12} sm={6} md={6} lg={6} xl={4}>
          <CourseWithProgress
            course={course}
            learningPathId={learningPathId}
            enrollmentDateInLearningPath={enrollmentDateInLearningPath}
            onCourseClick={() => onCourseClick(course.id)}
          />
        </Col>
      ))}
    </Row>
  </Container>
  );
};

export default CoursesWithProgressList;
