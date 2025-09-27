/**
 * Unit tests for Tool Usage Examples Library
 */

import { describe, it, expect } from 'vitest';
import {
  TOOL_EXAMPLES,
  getToolExamples,
  getParameterExample,
  getCommonMistakes,
  getUsageExample,
  getAvailableToolNames,
  searchExamples,
  getProblematicParameterExamples,
  type ToolExamples,
  type ParameterExample,
  type ToolExample,
} from '../../../../src/shared/examples/tool-examples.js';

describe('Tool Examples Library', () => {
  describe('TOOL_EXAMPLES Structure', () => {
    it('should have examples for key MCP tools', () => {
      const expectedTools = [
        'create_list',
        'get_list',
        'add_task',
        'set_task_priority',
        'search_tool',
        'show_tasks',
        'analyze_task',
        'set_task_dependencies',
      ];

      expectedTools.forEach(toolName => {
        expect(TOOL_EXAMPLES[toolName]).toBeDefined();
        expect(TOOL_EXAMPLES[toolName]!.description).toBeTruthy();
        expect(TOOL_EXAMPLES[toolName]!.parameters).toBeInstanceOf(Array);
        expect(TOOL_EXAMPLES[toolName]!.examples).toBeInstanceOf(Array);
        expect(TOOL_EXAMPLES[toolName]!.commonMistakes).toBeInstanceOf(Array);
      });
    });

    it('should have proper structure for each tool example', () => {
      Object.entries(TOOL_EXAMPLES).forEach(([toolName, toolExamples]) => {
        expect(toolExamples.description).toBeTruthy();
        expect(Array.isArray(toolExamples.parameters)).toBe(true);
        expect(Array.isArray(toolExamples.examples)).toBe(true);
        expect(Array.isArray(toolExamples.commonMistakes)).toBe(true);

        // Check parameter examples structure
        toolExamples.parameters.forEach(param => {
          expect(param.name).toBeTruthy();
          expect(param.correct).toBeDefined();
          expect(param.description).toBeTruthy();
        });

        // Check usage examples structure
        toolExamples.examples.forEach(example => {
          expect(example.tool).toBe(toolName);
          expect(example.description).toBeTruthy();
          expect(example.parameters).toBeDefined();
          expect(example.outcome).toBeTruthy();
        });

        // Check common mistakes structure
        toolExamples.commonMistakes.forEach(mistake => {
          expect(mistake.mistake).toBeTruthy();
          expect(mistake.fix).toBeTruthy();
        });
      });
    });
  });

  describe('Parameter Examples', () => {
    it('should have examples for commonly problematic parameters', () => {
      const createListExamples = TOOL_EXAMPLES.create_list!;
      const titleParam = createListExamples.parameters.find(p => p.name === 'title');
      
      expect(titleParam).toBeDefined();
      expect(titleParam!.correct).toBe('My Project Tasks');
      expect(titleParam!.description).toContain('descriptive title');
    });

    it('should include incorrect examples with explanations', () => {
      const addTaskExamples = TOOL_EXAMPLES.add_task!;
      const priorityParam = addTaskExamples.parameters.find(p => p.name === 'priority');
      
      expect(priorityParam).toBeDefined();
      expect(priorityParam!.incorrect).toBeDefined();
      expect(priorityParam!.incorrect!.length).toBeGreaterThan(0);
      
      priorityParam!.incorrect!.forEach(incorrect => {
        expect(incorrect.value).toBeDefined();
        expect(incorrect.reason).toBeTruthy();
      });
    });

    it('should have realistic correct examples', () => {
      const addTaskExamples = TOOL_EXAMPLES.add_task!;
      const tagsParam = addTaskExamples.parameters.find(p => p.name === 'tags');
      
      expect(tagsParam).toBeDefined();
      expect(Array.isArray(tagsParam!.correct)).toBe(true);
      expect((tagsParam!.correct as string[]).every(tag => typeof tag === 'string')).toBe(true);
    });
  });

  describe('Usage Examples', () => {
    it('should provide complete working examples', () => {
      const createListExamples = TOOL_EXAMPLES.create_list!;
      
      expect(createListExamples.examples.length).toBeGreaterThan(0);
      
      createListExamples.examples.forEach(example => {
        expect(example.tool).toBe('create_list');
        expect(example.parameters.title).toBeTruthy();
        expect(typeof example.parameters.title).toBe('string');
      });
    });

    it('should cover different usage scenarios', () => {
      const addTaskExamples = TOOL_EXAMPLES.add_task!;
      
      expect(addTaskExamples.examples.length).toBeGreaterThan(1);
      
      const simpleExample = addTaskExamples.examples.find(e => 
        e.description.toLowerCase().includes('simple')
      );
      const detailedExample = addTaskExamples.examples.find(e => 
        e.description.toLowerCase().includes('detailed')
      );
      
      expect(simpleExample).toBeDefined();
      expect(detailedExample).toBeDefined();
      
      // Simple example should have fewer parameters
      expect(Object.keys(simpleExample!.parameters).length).toBeLessThan(
        Object.keys(detailedExample!.parameters).length
      );
    });
  });

  describe('Common Mistakes', () => {
    it('should identify real-world mistakes', () => {
      const addTaskExamples = TOOL_EXAMPLES.add_task!;
      
      expect(addTaskExamples.commonMistakes.length).toBeGreaterThan(0);
      
      const priorityMistake = addTaskExamples.commonMistakes.find(m => 
        m.mistake.toLowerCase().includes('priority')
      );
      
      expect(priorityMistake).toBeDefined();
      expect(priorityMistake!.fix).toContain('1-5');
    });

    it('should provide actionable fixes', () => {
      Object.values(TOOL_EXAMPLES).forEach(toolExamples => {
        toolExamples.commonMistakes.forEach(mistake => {
          expect(mistake.fix).toBeTruthy();
          expect(mistake.fix.length).toBeGreaterThan(10); // Should be descriptive
        });
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getToolExamples', () => {
      it('should return examples for valid tool names', () => {
        const examples = getToolExamples('create_list');
        
        expect(examples).toBeDefined();
        expect(examples!.description).toBeTruthy();
        expect(examples!.parameters).toBeInstanceOf(Array);
      });

      it('should return undefined for invalid tool names', () => {
        const examples = getToolExamples('invalid_tool');
        
        expect(examples).toBeUndefined();
      });
    });

    describe('getParameterExample', () => {
      it('should return parameter example for valid tool and parameter', () => {
        const example = getParameterExample('add_task', 'priority');
        
        expect(example).toBeDefined();
        expect(example!.name).toBe('priority');
        expect(example!.correct).toBe(5);
      });

      it('should return undefined for invalid combinations', () => {
        const example1 = getParameterExample('invalid_tool', 'priority');
        const example2 = getParameterExample('add_task', 'invalid_param');
        
        expect(example1).toBeUndefined();
        expect(example2).toBeUndefined();
      });
    });

    describe('getCommonMistakes', () => {
      it('should return mistakes for valid tool names', () => {
        const mistakes = getCommonMistakes('add_task');
        
        expect(Array.isArray(mistakes)).toBe(true);
        expect(mistakes.length).toBeGreaterThan(0);
        
        mistakes.forEach(mistake => {
          expect(mistake.mistake).toBeTruthy();
          expect(mistake.fix).toBeTruthy();
        });
      });

      it('should return empty array for invalid tool names', () => {
        const mistakes = getCommonMistakes('invalid_tool');
        
        expect(Array.isArray(mistakes)).toBe(true);
        expect(mistakes.length).toBe(0);
      });
    });

    describe('getUsageExample', () => {
      it('should return first example when no scenario specified', () => {
        const example = getUsageExample('create_list');
        
        expect(example).toBeDefined();
        expect(example!.tool).toBe('create_list');
      });

      it('should find example by scenario keyword', () => {
        const example = getUsageExample('add_task', 'detailed');
        
        expect(example).toBeDefined();
        expect(example!.description.toLowerCase()).toContain('detailed');
      });

      it('should return undefined for invalid tool', () => {
        const example = getUsageExample('invalid_tool');
        
        expect(example).toBeUndefined();
      });
    });

    describe('getAvailableToolNames', () => {
      it('should return array of tool names', () => {
        const toolNames = getAvailableToolNames();
        
        expect(Array.isArray(toolNames)).toBe(true);
        expect(toolNames.length).toBeGreaterThan(0);
        expect(toolNames).toContain('create_list');
        expect(toolNames).toContain('add_task');
      });

      it('should return all tools that have examples', () => {
        const toolNames = getAvailableToolNames();
        const expectedCount = Object.keys(TOOL_EXAMPLES).length;
        
        expect(toolNames.length).toBe(expectedCount);
      });
    });

    describe('searchExamples', () => {
      it('should find examples by keyword', () => {
        const results = searchExamples('priority');
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        
        results.forEach(result => {
          expect(result.toolName).toBeTruthy();
          expect(result.example).toBeDefined();
          
          const searchText = (
            result.example.description + 
            result.example.outcome + 
            JSON.stringify(result.example.parameters)
          ).toLowerCase();
          
          expect(searchText).toContain('priority');
        });
      });

      it('should return empty array for non-existent keywords', () => {
        const results = searchExamples('nonexistentkeyword123');
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);
      });

      it('should be case insensitive', () => {
        const results1 = searchExamples('PRIORITY');
        const results2 = searchExamples('priority');
        
        expect(results1.length).toBe(results2.length);
      });
    });

    describe('getProblematicParameterExamples', () => {
      it('should return examples for commonly problematic parameters', () => {
        const problematicExamples = getProblematicParameterExamples();
        
        expect(typeof problematicExamples).toBe('object');
        expect(problematicExamples.priority).toBeDefined();
        expect(problematicExamples.tags).toBeDefined();
        
        Object.values(problematicExamples).forEach(examples => {
          expect(Array.isArray(examples)).toBe(true);
        });
      });

      it('should include tool context in parameter names', () => {
        const problematicExamples = getProblematicParameterExamples();
        
        if (problematicExamples.priority && problematicExamples.priority.length > 0) {
          const priorityExample = problematicExamples.priority[0]!;
          expect(priorityExample.name).toContain('.');
        }
      });
    });
  });

  describe('Data Quality', () => {
    it('should have consistent UUID format in examples', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      Object.values(TOOL_EXAMPLES).forEach(toolExamples => {
        toolExamples.examples.forEach(example => {
          Object.entries(example.parameters).forEach(([key, value]) => {
            if (key.toLowerCase().includes('id') && typeof value === 'string') {
              expect(value).toMatch(uuidRegex);
            }
            
            if (Array.isArray(value) && key.toLowerCase().includes('id')) {
              value.forEach(item => {
                if (typeof item === 'string') {
                  expect(item).toMatch(uuidRegex);
                }
              });
            }
          });
        });
      });
    });

    it('should have valid priority values in examples', () => {
      Object.values(TOOL_EXAMPLES).forEach(toolExamples => {
        toolExamples.examples.forEach(example => {
          if ('priority' in example.parameters) {
            const priority = example.parameters.priority;
            if (Array.isArray(priority)) {
              // Handle array format (for search_tool)
              priority.forEach((p: number) => {
                expect(p).toBeGreaterThanOrEqual(1);
                expect(p).toBeLessThanOrEqual(5);
              });
            } else {
              // Handle number format (for other tools)
              expect(priority as number).toBeGreaterThanOrEqual(1);
              expect(priority as number).toBeLessThanOrEqual(5);
            }
          }
        });
        
        toolExamples.parameters.forEach(param => {
          if (param.name === 'priority' && typeof param.correct === 'number') {
            expect(param.correct).toBeGreaterThanOrEqual(1);
            expect(param.correct).toBeLessThanOrEqual(5);
          }
        });
      });
    });

    it('should have valid array formats for tags and dependencies', () => {
      Object.values(TOOL_EXAMPLES).forEach(toolExamples => {
        toolExamples.parameters.forEach(param => {
          if (param.name === 'tags' || param.name === 'dependencies' || param.name === 'dependencyIds') {
            expect(Array.isArray(param.correct)).toBe(true);
          }
        });
        
        toolExamples.examples.forEach(example => {
          ['tags', 'dependencies', 'dependencyIds'].forEach(arrayParam => {
            if (arrayParam in example.parameters) {
              expect(Array.isArray(example.parameters[arrayParam])).toBe(true);
            }
          });
        });
      });
    });

    it('should have meaningful descriptions', () => {
      Object.values(TOOL_EXAMPLES).forEach(toolExamples => {
        expect(toolExamples.description.length).toBeGreaterThan(20);
        
        toolExamples.parameters.forEach(param => {
          expect(param.description.length).toBeGreaterThan(10);
        });
        
        toolExamples.examples.forEach(example => {
          expect(example.description.length).toBeGreaterThan(10);
          expect(example.outcome.length).toBeGreaterThan(15);
        });
      });
    });
  });

  describe('Coverage', () => {
    it('should cover all major MCP tool categories', () => {
      const toolNames = getAvailableToolNames();
      
      // List management
      expect(toolNames).toContain('create_list');
      expect(toolNames).toContain('get_list');
      
      // Task management
      expect(toolNames).toContain('add_task');
      expect(toolNames).toContain('set_task_priority');
      
      // Search and display
      expect(toolNames).toContain('search_tool');
      expect(toolNames).toContain('show_tasks');
      
      // Advanced features
      expect(toolNames).toContain('analyze_task');
      
      // Dependency management
      expect(toolNames).toContain('set_task_dependencies');
    });

    it('should have examples for the most error-prone parameters', () => {
      const errorProneParams = ['priority', 'tags', 'estimatedDuration', 'status', 'listId', 'taskId'];
      
      errorProneParams.forEach(paramName => {
        let found = false;
        
        Object.values(TOOL_EXAMPLES).forEach(toolExamples => {
          if (toolExamples.parameters.some(p => p.name === paramName)) {
            found = true;
          }
        });
        
        expect(found).toBe(true);
      });
    });
  });
});