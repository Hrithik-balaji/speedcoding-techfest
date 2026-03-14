import { useContext } from 'react';
import ExamContext from '../context/ExamContext';

export function useExam() {
  return useContext(ExamContext);
}
