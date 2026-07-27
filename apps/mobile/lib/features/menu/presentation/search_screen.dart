import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/router/app_router.dart';
import '../../../core/widgets/async_value_widget.dart';
import '../application/menu_providers.dart';
import 'widgets/menu_item_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      ref.read(menuSearchQueryProvider.notifier).state = value.trim();
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(menuSearchQueryProvider);
    final resultsAsync = ref.watch(menuSearchResultsProvider);
    final moneyFormatter = ref.watch(moneyFormatterProvider);

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          onChanged: _onChanged,
          decoration: const InputDecoration(
            hintText: 'Search the menu...',
            border: InputBorder.none,
          ),
        ),
        actions: [
          if (_controller.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _controller.clear();
                ref.read(menuSearchQueryProvider.notifier).state = '';
              },
            ),
        ],
      ),
      body: query.isEmpty
          ? const Center(child: Text('Search for dishes, drinks, and more.'))
          : AsyncValueWidget(
              value: resultsAsync,
              onRetry: () => ref.invalidate(menuSearchResultsProvider),
              data: (results) => results.isEmpty
                  ? const Center(child: Text('No matching items found.'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: results.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final item = results[index];
                        return MenuItemCard(
                          item: item,
                          moneyFormatter: moneyFormatter,
                          onTap: () =>
                              context.push(AppRoutes.itemDetailPath(item.id)),
                        );
                      },
                    ),
            ),
    );
  }
}
