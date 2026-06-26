import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { UserService } from './user.service';

export const authedGuard: CanActivateFn = () => {
  const router = inject(Router);
  const userService = inject(UserService);

  return userService.verifyAuth().pipe(
    map((isAuthenticated) => (isAuthenticated ? true : router.parseUrl('/')))
  );
};

export const anonGuard: CanActivateFn = () => {
  const router = inject(Router);
  const userService = inject(UserService);

  return userService.verifyAuth().pipe(
    map((isAuthenticated) => (isAuthenticated ? router.parseUrl('/') : true))
  );
};
