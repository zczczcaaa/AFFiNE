import test from 'ava';

import { DocRole, WorkspaceRole } from '../index';
import { Actions, ActionsKeys, mapRoleToActions } from '../types';

// create a matrix representing the all possible permission of WorkspaceRole and DocRole
const matrix = Object.values(WorkspaceRole)
  .filter(r => typeof r !== 'string')
  .flatMap(workspaceRole =>
    Object.values(DocRole)
      .filter(r => typeof r !== 'string')
      .map(docRole => ({
        workspaceRole,
        docRole,
      }))
  );

for (const { workspaceRole, docRole } of matrix) {
  const permission = mapRoleToActions(workspaceRole, docRole);
  test(`should be able to get correct permissions from WorkspaceRole: ${WorkspaceRole[workspaceRole]} and DocRole: ${DocRole[docRole]}`, t => {
    t.snapshot(permission);
  });
}

test('ActionsKeys value should be the same order of the Actions objects', t => {
  for (const [index, value] of ActionsKeys.entries()) {
    const [k, k1, k2] = value.split('.');
    if (k2) {
      // @ts-expect-error
      t.is(Actions[k][k1][k2], index);
    } else {
      // @ts-expect-error
      t.is(Actions[k][k1], index);
    }
  }
});
